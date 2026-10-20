"""Independent protobuf/required-field validation of a .key archive.

Usage: python verify-keynote-native.py deck.key keynote-descriptors.pb
Requires protobuf and python-snappy. Build the descriptor set from KeynoteKit's
proto/14.4 using protoc --include_imports --descriptor_set_out=... *.proto.
The application importer and private bridge are deliberately not used.
"""
import json
import re
from pathlib import Path
import sys
import zipfile

import snappy
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory


def varint(data, offset):
    value, shift = 0, 0
    while offset < len(data) and shift < 70:
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
        shift += 7
    raise ValueError("Truncated native varint")


def main():
    archive_path, descriptor_path = map(Path, sys.argv[1:3])
    definitions = descriptor_pb2.FileDescriptorSet.FromString(descriptor_path.read_bytes())
    pool = descriptor_pool.DescriptorPool()
    pending = list(definitions.file)
    while pending:
        next_pending = []
        for definition in pending:
            try:
                pool.Add(definition)
            except TypeError:
                next_pending.append(definition)
        if len(next_pending) == len(pending):
            raise ValueError("Unresolved descriptor dependencies")
        pending = next_pending
    schema = (Path(__file__).resolve().parents[1] / "src/utils/keynote/schema.ts").read_text()
    registry = json.loads(re.search(r"NATIVE_TYPE_NAMES = JSON.parse\(`(.*?)`\)", schema, re.S).group(1))
    archive_class = message_factory.GetMessageClass(pool.FindMessageTypeByName("TSP.ArchiveInfo"))
    failures, checked = [], 0
    with zipfile.ZipFile(archive_path) as package:
        for name in package.namelist():
            if not name.lower().endswith(".iwa"):
                continue
            framed, offset, parts = package.read(name), 0, []
            while offset < len(framed):
                kind = framed[offset]
                length = int.from_bytes(framed[offset + 1:offset + 4], "little")
                offset += 4
                block = framed[offset:offset + length]
                offset += length
                parts.append(snappy.decompress(block) if kind == 0 else block)
            stream, offset = b"".join(parts), 0
            while offset < len(stream):
                size, offset = varint(stream, offset)
                info = archive_class.FromString(stream[offset:offset + size])
                offset += size
                for message_info in info.message_infos:
                    payload = stream[offset:offset + message_info.length]
                    offset += message_info.length
                    type_name = registry.get(str(message_info.type))
                    if not type_name:
                        continue
                    message_class = message_factory.GetMessageClass(pool.FindMessageTypeByName(type_name))
                    message = message_class.FromString(payload)
                    errors = message.FindInitializationErrors()
                    if errors:
                        failures.append(f"{name}:{info.identifier} {type_name}: {', '.join(errors)}")
                    checked += 1
    for failure in failures:
        print(failure)
    print(f"{checked} native messages decoded independently; {len(failures)} missing required-field failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
