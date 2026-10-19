const fs = require('fs');
const path = require('path');

// 1. Translate AIPPT.json
const aipptEnglish = [
  {
    type: "cover",
    data: {
      title: "Criminal Psychology Research",
      text: "Exploring the causes, characteristics, and intervention strategies of criminal behavior to empower prevention and rehabilitation."
    }
  },
  {
    type: "contents",
    data: {
      items: [
        "Overview of Criminal Psychology",
        "Formation of Criminal Mindsets",
        "Crime Typologies & Behavioral Traits",
        "Psychological Assessment & Intervention",
        "Applied Criminal Psychology",
        "Future Frontiers & Technologies"
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Overview of Criminal Psychology",
      text: "This chapter introduces the fundamental definitions, historical milestones, core theories, and research domains of criminal psychology."
    }
  },
  {
    type: "content",
    data: {
      title: "Definition & Historical Origins",
      items: [
        {
          title: "Defining Criminal Psychology",
          text: "The scientific study of criminal actions, cognitive structures, and behavioral motivations underlying illicit conduct."
        },
        {
          title: "Evolution & Milestones",
          text: "Emerging in the late 19th century, evolving through legal philosophy and experimental psychology into an independent academic discipline."
        },
        {
          title: "Core Research Domains",
          text: "Focusing on etiology, personality profiles, risk assessment metrics, interrogation dynamics, and custodial interventions."
        },
        {
          title: "Interdisciplinary Connections",
          text: "Deeply interconnected with jurisprudence, sociology, forensic psychiatry, behavioral neuroscience, and criminology."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Foundational Theories",
      items: [
        {
          title: "Biological Theories",
          text: "Investigating genetic markers, neurochemical pathways, and prefrontal cortex function in aggressive behavior."
        },
        {
          title: "Psychological Theories",
          text: "Analyzing personality structures, moral cognitive development, impulse regulation, and emotional processing deficits."
        },
        {
          title: "Sociological Theories",
          text: "Examining environmental pressures, subcultural socialization, systemic inequities, and differential association."
        },
        {
          title: "Integrated Biosocial Models",
          text: "Synthesizing biological predispositions and environmental triggers into cohesive multi-level frameworks."
        }
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Formation of Criminal Mindsets",
      items: [
        "Individual developmental factors",
        "Social and ambient environmental pressures",
        "Cognitive schemas and affective processes"
      ],
      text: "Investigating how genetic dispositions, ambient triggers, and maladaptive cognitive frameworks converge into criminal conduct."
    }
  },
  {
    type: "content",
    data: {
      title: "Individual Factors",
      items: [
        {
          title: "Genetic Predispositions",
          text: "Twin and adoption studies highlighting genetic risk variants associated with impulsivity and stress vulnerability."
        },
        {
          title: "Psychological Traits",
          text: "Trait measures including sensation seeking, emotional lability, low empathy, and reduced harm avoidance."
        },
        {
          title: "Personality Disorders",
          text: "The clinical role of Antisocial Personality Disorder (ASPD) and psychopathic traits in persistent offending."
        },
        {
          title: "Early Developmental Adversity",
          text: "Long-term neurological and psychological impacts of childhood trauma, attachment disruptions, and neglect."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Environmental Factors",
      items: [
        {
          title: "Family Architecture",
          text: "Parenting consistency, parental monitoring, intra-familial conflict, and generational exposure to violence."
        },
        {
          title: "Peer Group Influence",
          text: "Social reinforcement, deviant peer clustering, gang affiliation, and perceived norms."
        },
        {
          title: "Socioeconomic Factors",
          text: "Neighborhood structural instability, relative deprivation, systemic stress, and limited legitimate opportunity structures."
        },
        {
          title: "Cultural Values & Norms",
          text: "Subcultural definitions of honor, aggression sanctioning, and institutional distrust."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Cognitive & Emotional Processes",
      items: [
        {
          title: "Cognitive Distortions",
          text: "Hostile attribution bias, moral disengagement, minimization of harm, and victim blaming."
        },
        {
          title: "Emotional Dysregulation",
          text: "Acute rage, chronic emotional numbness, and inability to tolerate distress under perceived provocation."
        },
        {
          title: "Decision-Making Dynamics",
          text: "Hyperbolic time discounting, immediate reward prioritization, and inaccurate probability assessment."
        },
        {
          title: "Stress Coping Mechanisms",
          text: "Maladaptive externalizing behaviors deployed as compensatory coping tools for chronic strain."
        }
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Crime Typologies & Behavioral Traits",
      text: "Contrasting psychological profiles across violent offending, property violations, and modern cyber threats."
    }
  },
  {
    type: "content",
    data: {
      title: "Violent Offending",
      items: [
        {
          title: "Homicide & Physical Assault",
          text: "Differentiating between reactive affect-driven violence and premeditated instrumental aggression."
        },
        {
          title: "Sexual Offenses",
          text: "Cognitive distortions regarding consent, sexual preoccupation, and power-assertion motives."
        },
        {
          title: "Psychological Impact on Victims",
          text: "Severe acute stress, PTSD symptomatology, hypervigilance, and long-term socio-emotional impairment."
        },
        {
          title: "Recidivism Risk Dimensions",
          text: "Assessing actuarial risk factors, violence history, substance abuse comorbidity, and treatment responsiveness."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Property & White-Collar Crime",
      items: [
        {
          title: "Theft & Burglary",
          text: "Impulse-control deficits, economic utilitarian incentives, and thrill-seeking sensation drivers."
        },
        {
          title: "Fraud & Financial Crimes",
          text: "Machiavellian traits, corporate rationalization, high entitlement, and systemic cognitive dissonance."
        },
        {
          title: "Cyber Financial Scams",
          text: "Psychological manipulation techniques, engineered urgency, trust exploitation, and social engineering."
        },
        {
          title: "Social & Economic Harm",
          text: "Erosion of institutional confidence, financial destabilization of vulnerable populations, and legal costs."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Cybercrime & Digital Deviance",
      items: [
        {
          title: "Hacking & System Intrusions",
          text: "Technical mastery motives, online disinhibition effects, defiance of authority, and anonymity shield."
        },
        {
          title: "Cyber Harassment & Stalking",
          text: "Fixated obsession, perceived omnipresence, revenge validation, and digital dehumanization."
        },
        {
          title: "Identity Theft & Online Exploitation",
          text: "Asymmetric victim detachment, compartmentalized moral cognition, and transnational criminal syndicates."
        },
        {
          title: "Virtual Environment Dynamics",
          text: "Spatial and temporal disconnection diminishing immediate moral feedback during unlawful digital acts."
        }
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Psychological Assessment & Intervention",
      text: "Methodologies for forensic clinical evaluation, risk stratification, cognitive-behavioral rehabilitation, and recidivism reduction."
    }
  },
  {
    type: "content",
    data: {
      title: "Diagnostic & Assessment Instruments",
      items: [
        {
          title: "Psychopathy Checklist (PCL-R)",
          text: "Standardized clinical instrument assessing interpersonal, affective, lifestyle, and antisocial facets."
        },
        {
          title: "MMPI-3 Clinical Profiling",
          text: "Multi-scale objective personality assessment capturing defensiveness, symptom exaggeration, and internalizing pathology."
        },
        {
          title: "Forensic Risk Engines (HCR-20 / VRAG)",
          text: "Structured professional judgment tools synthesizing historical, clinical, and contextual risk variables."
        },
        {
          title: "Behavioral Analysis & Polygraph",
          text: "Complementary interview frameworks and autonomic nervous system monitoring in forensic interrogation."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Evidence-Based Intervention Strategies",
      items: [
        {
          title: "Cognitive Behavioral Therapy (CBT)",
          text: "Targeting criminal thinking patterns, automatic hostile attributions, and moral reasoning deficits."
        },
        {
          title: "Dialectical Behavior Protocols",
          text: "Building distress tolerance, emotion regulation competencies, and interpersonal mindfulness."
        },
        {
          title: "Anger Management Programs",
          text: "Recognizing physiological arousal cues, cognitive pauses, and assertive non-violent dispute resolution."
        },
        {
          title: "Substance Dependency Treatment",
          text: "Addressing co-occurring addictions that lower behavioral inhibition thresholds and catalyze reoffending."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Multi-Tier Prevention Systems",
      items: [
        {
          title: "Primary Prevention in Schools",
          text: "Universal social-emotional learning, conflict mediation curricula, and emotional literacy training."
        },
        {
          title: "Targeted Youth Mentorship",
          text: "Secondary intervention for high-risk adolescents, structured recreation, and vocational guidance."
        },
        {
          title: "Community Restorative Frameworks",
          text: "Restorative justice dialogues, community cohesion building, and situational crime prevention."
        },
        {
          title: "Post-Incarceration Re-Entry",
          text: "Transitional housing, employment coaching, continuing mental health support, and stigma reduction."
        }
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Applied Criminal Psychology",
      text: "Practical operational deployment within courts, custodial institutions, police profiling, and public policy formulation."
    }
  },
  {
    type: "content",
    data: {
      title: "Criminal Justice System Collaboration",
      items: [
        {
          title: "Offender Profiling & Case Linkage",
          text: "Extracting behavioral signatures, MO consistency, and geographical crime mapping to aid active investigations."
        },
        {
          title: "Eyewitness Memory & Lineup Design",
          text: "Mitigating cognitive bias, false memory formation, and suggestibility through double-blind identification."
        },
        {
          title: "Competency to Stand Trial",
          text: "Clinical evaluation of rational understanding, trial fitness, and capacity to assist legal defense counsel."
        },
        {
          title: "Sentencing & Parole Input",
          text: "Delivering objective risk-need-responsivity (RNR) evaluations to judiciary and parole boards."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Custodial Management & Correction",
      items: [
        {
          title: "Correctional Facility Triage",
          text: "Categorizing offenders by security requirements, vulnerability, and therapeutic placement needs."
        },
        {
          title: "Institutional Crisis Mediation",
          text: "De-escalating prison violence, self-harm incidents, hostage negotiations, and staff safety protocols."
        },
        {
          title: "Rehabilitation Mileu Building",
          text: "Designing custodial environments that promote pro-social identity transformation and accountability."
        },
        {
          title: "Correctional Staff Wellness",
          text: "Mitigating secondary traumatic stress, burnout, and moral injury among custodial officers."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Academic Research & Public Policy",
      items: [
        {
          title: "Longitudinal Cohort Studies",
          text: "Tracking life-course persistent versus adolescent-limited delinquency trajectories across decades."
        },
        {
          title: "Cross-Cultural Comparative Data",
          text: "Identifying culturally universal versus culture-specific psychological markers of law-violating behavior."
        },
        {
          title: "Policy Reform Advocacy",
          text: "Providing empirical evidence to reform juvenile justice sentencing and solitary confinement rules."
        },
        {
          title: "Professional Training Standards",
          text: "Educating law enforcement, prosecutors, and magistrates on trauma-informed interrogation techniques."
        }
      ]
    }
  },
  {
    type: "transition",
    data: {
      title: "Future Frontiers & Technologies",
      text: "Exploring the transformative impacts of artificial intelligence, neuroscience, wearable biometrics, and ethical challenges."
    }
  },
  {
    type: "content",
    data: {
      title: "Emerging Technological Integration",
      items: [
        {
          title: "AI Predictive Analytics",
          text: "Machine learning algorithms synthesizing multi-source data for dynamic recidivism forecasting."
        },
        {
          title: "Virtual Reality Rehabilitation",
          text: "Immersive VR scenarios simulating high-risk triggers to practice emotional self-control in safe settings."
        },
        {
          title: "Neuroimaging Diagnostics",
          text: "Functional MRI and fNIRS investigating neural correlates of psychopathic affective blunting."
        },
        {
          title: "Continuous Biometric Monitoring",
          text: "Wearable biosensors tracking real-time autonomic stress arousal in supervised release programs."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Interdisciplinary Convergence",
      items: [
        {
          title: "Neuro-Law & Judicial Standards",
          text: "Re-evaluating legal free will and culpability in light of advanced brain mapping discoveries."
        },
        {
          title: "Epigenetics & Gene-Environment Interactions",
          text: "Analyzing how adverse childhood environments biochemically modify stress-response gene expression."
        },
        {
          title: "Big Data Behavioral Modeling",
          text: "Mining decentralized online communications to detect early radicalization and violent intent."
        },
        {
          title: "Public Health Crime Frameworks",
          text: "Reframing community violence as a contagious epidemiological vector requiring preventative contagion control."
        }
      ]
    }
  },
  {
    type: "content",
    data: {
      title: "Ethical Dilemmas & Future Governance",
      items: [
        {
          title: "Algorithmic Fairness & Bias",
          text: "Eliminating racial, demographic, and socioeconomic disparities ingrained in machine learning risk tools."
        },
        {
          title: "Mental Privacy & Neuromonitoring",
          text: "Protecting the fundamental right to cognitive liberty against involuntary biometric surveillance."
        },
        {
          title: "Risk-Labeling Stigmatization",
          text: "Preventing self-fulfilling prophecy effects when classifying at-risk youths with predictive tags."
        },
        {
          title: "Therapeutic Autonomy & Consent",
          text: "Balancing mandatory custodial psychological treatment with international human rights standards."
        }
      ]
    }
  },
  {
    type: "end"
  }
];

fs.writeFileSync('public/mocks/AIPPT.json', JSON.stringify(aipptEnglish, null, 2), 'utf8');
console.log('Successfully translated AIPPT.json!');

// 2. Translate template_1.json through template_8.json
const templateFiles = [
  'template_1.json', 'template_2.json', 'template_3.json', 'template_4.json',
  'template_5.json', 'template_6.json', 'template_7.json', 'template_8.json'
];

const phraseReplacements = [
  ['未命名演示文稿', 'Untitled Presentation'],
  ['模板封面标题', 'Presentation Title'],
  ['模板封面正文', 'Your presentation subtitle or brief overview goes here. Customize this text to fit your topic.'],
  ['封面页主标题', 'Presentation Title'],
  ['封面页副标题', 'Subtitle and presentation summary goes here.'],
  ['封面页标题', 'Presentation Title'],
  ['演讲人', 'Presenter'],
  ['汇报人', 'Presenter'],
  ['时间', 'Date'],
  ['日期', 'Date'],
  ['商务汇报', 'Business Review'],
  ['工作总结', 'Quarterly Summary'],
  ['工作计划', 'Strategic Plan'],
  ['在此输入标题', 'Enter Title Here'],
  ['欢迎观看', 'Welcome'],
  ['项目', 'Agenda Item'],
  ['六', 'Item 6'],
  ['目录项一', '1. Executive Summary'],
  ['目录项二', '2. Market Analysis'],
  ['目录项三', '3. Product Strategy'],
  ['目录项四', '4. Financial Overview'],
  ['目录项五', '5. Roadmap & Growth'],
  ['目录项六', '6. Key Milestones'],
  ['目录项七', '7. Operational Plan'],
  ['目录项八', '8. Risk Management'],
  ['目录项九', '9. Strategic Priorities'],
  ['目录项十', '10. Appendix & Q&A'],
  ['目录项', 'Agenda Topic'],
  ['目', 'AGENDA'],
  ['录', ''],
  ['目录', 'Agenda'],
  ['模板小节过渡标题', 'Section Header'],
  ['模板小节过渡正文', 'Detailed transition points and section insights are outlined here.'],
  ['过渡页标题', 'Section Header'],
  ['过渡页副标题', 'Explore this chapter’s main initiatives and takeaways.'],
  ['过渡页正文', 'Section summary and strategic discussion points.'],
  ['模板过渡标题', 'Section Header'],
  ['模板内容页标题', 'Key Insights & Overview'],
  ['内容页标题', 'Strategy Overview'],
  ['内容项标题', 'Strategic Pillar'],
  ['内容项正文', 'Detailed analysis, metrics, and actionable deliverables for this strategic focus area.'],
  ['内容项', 'Topic Point'],
  ['模板封面', 'Keynote Title Slide'],
  ['页副标题', 'Subtitle'],
  ['模板', 'Theme Slide'],
  ['谢谢聆听', 'Thank You'],
  ['感谢您的观看', 'Thank You For Watching'],
  ['感谢聆听', 'Thank You'],
  ['感谢倾听', 'Thank You'],
  ['感谢观看', 'Thank You'],
  ['感谢', 'Thank You'],
  ['你的', 'for'],
  ['观看', 'Watching']
];

templateFiles.forEach(tf => {
  const p = path.join('public/mocks', tf);
  let content = fs.readFileSync(p, 'utf8');

  // Multi-pass replacement from longest phrases to shorter ones
  phraseReplacements.forEach(([zh, en]) => {
    // Global replace
    content = content.split(zh).join(en);
  });

  // Check if any leftover Chinese
  const leftovers = content.match(/[\u4e00-\u9fff]+/g);
  if (leftovers) {
    console.log(`Warning: ${tf} has leftovers:`, Array.from(new Set(leftovers)));
  } else {
    console.log(`Clean: ${tf} has 0 Chinese characters left!`);
  }
  fs.writeFileSync(p, content, 'utf8');
});
