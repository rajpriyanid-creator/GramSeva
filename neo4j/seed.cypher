// ═══════════════════════════════════════════════════════════════════════════
// GramSeva Neo4j AuraDB — Seed Data
// Run AFTER constraints.cypher and indexes.cypher
// Contains: 10 States, 20 Schemes, Departments, Criteria, Sample CSCs
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. States ────────────────────────────────────────────────────────────────
MERGE (all:State  {code:'ALL'}) SET all.name  = 'All India';
MERGE (tn:State   {code:'TN'})  SET tn.name   = 'Tamil Nadu';
MERGE (up:State   {code:'UP'})  SET up.name   = 'Uttar Pradesh';
MERGE (mh:State   {code:'MH'})  SET mh.name   = 'Maharashtra';
MERGE (ap:State   {code:'AP'})  SET ap.name   = 'Andhra Pradesh';
MERGE (ts:State   {code:'TS'})  SET ts.name   = 'Telangana';
MERGE (ka:State   {code:'KA'})  SET ka.name   = 'Karnataka';
MERGE (kl:State   {code:'KL'})  SET kl.name   = 'Kerala';
MERGE (wb:State   {code:'WB'})  SET wb.name   = 'West Bengal';
MERGE (rj:State   {code:'RJ'})  SET rj.name   = 'Rajasthan';
MERGE (gj:State   {code:'GJ'})  SET gj.name   = 'Gujarat';
MERGE (mp:State   {code:'MP'})  SET mp.name   = 'Madhya Pradesh';
MERGE (br:State   {code:'BR'})  SET br.name   = 'Bihar';
MERGE (od:State   {code:'OD'})  SET od.name   = 'Odisha';
MERGE (pb:State   {code:'PB'})  SET pb.name   = 'Punjab';

// ── 2. Departments ───────────────────────────────────────────────────────────
MERGE (d_agri:Department {id:'DEPT_AGRI'})
  SET d_agri += {name:'Ministry of Agriculture & Farmers Welfare', helpline:'1800-180-1551', portal:'https://pmkisan.gov.in'};

MERGE (d_fin:Department {id:'DEPT_FIN'})
  SET d_fin += {name:'Ministry of Finance', helpline:'1800-11-0001', portal:'https://pmsby.in'};

MERGE (d_health:Department {id:'DEPT_HEALTH'})
  SET d_health += {name:'Ministry of Health & Family Welfare', helpline:'14555', portal:'https://pmjay.gov.in'};

MERGE (d_rural:Department {id:'DEPT_RURAL'})
  SET d_rural += {name:'Ministry of Rural Development', helpline:'1800-11-8111', portal:'https://nrega.nic.in'};

MERGE (d_wcd:Department {id:'DEPT_WCD'})
  SET d_wcd += {name:'Ministry of Women & Child Development', helpline:'181', portal:'https://wcd.nic.in'};

MERGE (d_skill:Department {id:'DEPT_SKILL'})
  SET d_skill += {name:'Ministry of Skill Development & Entrepreneurship', helpline:'1800-123-9626', portal:'https://pmkvy.in'};

MERGE (d_msme:Department {id:'DEPT_MSME'})
  SET d_msme += {name:'Ministry of MSME', helpline:'1800-111-188', portal:'https://msme.gov.in'};

MERGE (d_education:Department {id:'DEPT_EDU'})
  SET d_education += {name:'Ministry of Education', helpline:'1800-11-8004', portal:'https://scholarships.gov.in'};

MERGE (d_housing:Department {id:'DEPT_HOUSING'})
  SET d_housing += {name:'Ministry of Housing & Urban Affairs', helpline:'1800-11-3388', portal:'https://pmaymis.gov.in'};

MERGE (d_power:Department {id:'DEPT_POWER'})
  SET d_power += {name:'Ministry of Power', helpline:'1800-11-5600', portal:'https://saubhagya.gov.in'};

// ── 3. Schemes ───────────────────────────────────────────────────────────────

// 3.1 PM-KISAN
MERGE (s1:Scheme {id:'PM_KISAN'})
  SET s1 += {
    name: 'PM Kisan Samman Nidhi',
    name_hi: 'प्रधानमंत्री किसान सम्मान निधि',
    name_ta: 'பிரதமர் கிசான் சம்மான் நிதி',
    name_te: 'పీఎం కిసాన్ సమ్మాన్ నిధి',
    name_kn: 'ಪಿಎಂ ಕಿಸಾನ್ ಸಮ್ಮಾನ ನಿಧಿ',
    name_mr: 'पीएम किसान सन्मान निधी',
    name_bn: 'পিএম কিষাণ সম্মান নিধি',
    benefit: '₹6,000/year directly into bank account (₹2,000 every 4 months)',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    type: 'Direct Benefit Transfer',
    url: 'https://pmkisan.gov.in',
    active: true
  };
MATCH (s1:Scheme {id:'PM_KISAN'}), (d:Department {id:'DEPT_AGRI'})
  MERGE (s1)-[:OFFERED_BY]->(d);
MATCH (s1:Scheme {id:'PM_KISAN'}), (st:State {code:'ALL'})
  MERGE (s1)-[:AVAILABLE_IN]->(st);

MERGE (c1a:Criteria {id:'PM_KISAN_C1'})
  SET c1a += {field:'occupation', operator:'=', value:'farmer', label:'Must be a farmer'};
MERGE (c1b:Criteria {id:'PM_KISAN_C2'})
  SET c1b += {field:'land_acres', operator:'>', value:'0', label:'Must own agricultural land'};
MATCH (s1:Scheme {id:'PM_KISAN'}), (c:Criteria) WHERE c.id IN ['PM_KISAN_C1','PM_KISAN_C2']
  MERGE (s1)-[:REQUIRES]->(c);

// 3.2 PMSBY - Suraksha Bima
MERGE (s2:Scheme {id:'PMSBY'})
  SET s2 += {
    name: 'PM Suraksha Bima Yojana',
    name_hi: 'प्रधानमंत्री सुरक्षा बीमा योजना',
    name_ta: 'பிரதமர் சுரக்ஷா பீமா யோஜனா',
    name_te: 'పీఎం సురక్ష బీమా యోజన',
    name_kn: 'ಪಿಎಂ ಸುರಕ್ಷಾ ಬಿಮಾ ಯೋಜನೆ',
    name_mr: 'पीएम सुरक्षा विमा योजना',
    name_bn: 'পিএম সুরক্ষা বীমা যোজনা',
    benefit: '₹2 lakh accidental death/disability cover for just ₹20/year',
    ministry: 'Ministry of Finance',
    type: 'Insurance',
    url: 'https://jansuraksha.gov.in/Forms-PMSBY.aspx',
    active: true
  };
MATCH (s2:Scheme {id:'PMSBY'}), (d:Department {id:'DEPT_FIN'})
  MERGE (s2)-[:OFFERED_BY]->(d);
MATCH (s2:Scheme {id:'PMSBY'}), (st:State {code:'ALL'})
  MERGE (s2)-[:AVAILABLE_IN]->(st);
MERGE (c2a:Criteria {id:'PMSBY_C1'})
  SET c2a += {field:'age_min', operator:'>=', value:'18', label:'Age 18 or above'};
MERGE (c2b:Criteria {id:'PMSBY_C2'})
  SET c2b += {field:'age_max', operator:'<=', value:'70', label:'Age 70 or below'};
MATCH (s2:Scheme {id:'PMSBY'}), (c:Criteria) WHERE c.id IN ['PMSBY_C1','PMSBY_C2']
  MERGE (s2)-[:REQUIRES]->(c);

// 3.3 PMJJBY - Jeevan Jyoti Bima
MERGE (s3:Scheme {id:'PMJJBY'})
  SET s3 += {
    name: 'PM Jeevan Jyoti Bima Yojana',
    name_hi: 'प्रधानमंत्री जीवन ज्योति बीमा योजना',
    name_ta: 'பிரதமர் ஜீவன் ஜோதி பீமா யோஜனா',
    name_te: 'పీఎం జీవన్ జ్యోతి బీమా యోజన',
    name_kn: 'ಪಿಎಂ ಜೀವನ ಜ್ಯೋತಿ ಬಿಮಾ ಯೋಜನೆ',
    name_mr: 'पीएम जीवन ज्योती बीमा योजना',
    name_bn: 'পিএম জীবন জ্যোতি বীমা যোজনা',
    benefit: '₹2 lakh life insurance cover for ₹436/year',
    ministry: 'Ministry of Finance',
    type: 'Insurance',
    url: 'https://jansuraksha.gov.in/Forms-PMJJBY.aspx',
    active: true
  };
MATCH (s3:Scheme {id:'PMJJBY'}), (d:Department {id:'DEPT_FIN'})
  MERGE (s3)-[:OFFERED_BY]->(d);
MATCH (s3:Scheme {id:'PMJJBY'}), (st:State {code:'ALL'})
  MERGE (s3)-[:AVAILABLE_IN]->(st);
MERGE (c3a:Criteria {id:'PMJJBY_C1'})
  SET c3a += {field:'age_min', operator:'>=', value:'18', label:'Age 18 or above'};
MERGE (c3b:Criteria {id:'PMJJBY_C2'})
  SET c3b += {field:'age_max', operator:'<=', value:'50', label:'Age 50 or below'};
MATCH (s3:Scheme {id:'PMJJBY'}), (c:Criteria) WHERE c.id IN ['PMJJBY_C1','PMJJBY_C2']
  MERGE (s3)-[:REQUIRES]->(c);

// 3.4 Ayushman Bharat PM-JAY
MERGE (s4:Scheme {id:'PMJAY'})
  SET s4 += {
    name: 'Ayushman Bharat PM-JAY',
    name_hi: 'आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना',
    name_ta: 'ஆயுஷ்மான் பாரத் பிரதமர் ஜன் ஆரோக்கிய யோஜனா',
    name_te: 'ఆయుష్మాన్ భారత్ పీఎం జన్ ఆరోగ్య యోజన',
    name_kn: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಪಿಎಂ-ಜೆಎವೈ',
    name_mr: 'आयुष्मान भारत पीएम-जेएवाय',
    name_bn: 'আয়ুষ্মান ভারত পিএম-জেএওয়াই',
    benefit: '₹5 lakh/year health insurance for hospitalisation (cashless)',
    ministry: 'Ministry of Health & Family Welfare',
    type: 'Health Insurance',
    url: 'https://pmjay.gov.in',
    active: true
  };
MATCH (s4:Scheme {id:'PMJAY'}), (d:Department {id:'DEPT_HEALTH'})
  MERGE (s4)-[:OFFERED_BY]->(d);
MATCH (s4:Scheme {id:'PMJAY'}), (st:State {code:'ALL'})
  MERGE (s4)-[:AVAILABLE_IN]->(st);
MERGE (c4a:Criteria {id:'PMJAY_C1'})
  SET c4a += {field:'bpl_card', operator:'=', value:'true', label:'BPL card holder'};
MERGE (c4b:Criteria {id:'PMJAY_C2'})
  SET c4b += {field:'income_max', operator:'<=', value:'200000', label:'Annual income ≤ ₹2,00,000'};
MATCH (s4:Scheme {id:'PMJAY'}), (c:Criteria) WHERE c.id IN ['PMJAY_C1','PMJAY_C2']
  MERGE (s4)-[:REQUIRES]->(c);

// 3.5 MGNREGA
MERGE (s5:Scheme {id:'MGNREGA'})
  SET s5 += {
    name: 'Mahatma Gandhi NREGA (Job Guarantee)',
    name_hi: 'महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी योजना',
    name_ta: 'மகாத்மா காந்தி தேசிய கிராமப்புற வேலை உத்தரவாதத் திட்டம்',
    name_te: 'మహాత్మా గాంధీ జాతీయ గ్రామీణ ఉపాధి హామీ పథకం',
    name_kn: 'ಮಹಾತ್ಮ ಗಾಂಧಿ ರಾಷ್ಟ್ರೀಯ ಗ್ರಾಮೀಣ ಉದ್ಯೋಗ ಖಾತರಿ ಯೋಜನೆ',
    name_mr: 'महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार हमी योजना',
    name_bn: 'মহাত্মা গান্ধী জাতীয় গ্রামীণ কর্মসংস্থান নিশ্চয়তা আইন',
    benefit: '100 days of guaranteed wage employment per rural household per year',
    ministry: 'Ministry of Rural Development',
    type: 'Employment Guarantee',
    url: 'https://nrega.nic.in',
    active: true
  };
MATCH (s5:Scheme {id:'MGNREGA'}), (d:Department {id:'DEPT_RURAL'})
  MERGE (s5)-[:OFFERED_BY]->(d);
MATCH (s5:Scheme {id:'MGNREGA'}), (st:State {code:'ALL'})
  MERGE (s5)-[:AVAILABLE_IN]->(st);
MERGE (c5a:Criteria {id:'MGNREGA_C1'})
  SET c5a += {field:'occupation', operator:'=', value:'labourer', label:'Rural household / unskilled labourer'};
MATCH (s5:Scheme {id:'MGNREGA'}), (c:Criteria {id:'MGNREGA_C1'})
  MERGE (s5)-[:REQUIRES]->(c);

// 3.6 PM Mudra Yojana - SHISHU
MERGE (s6:Scheme {id:'MUDRA_SHISHU'})
  SET s6 += {
    name: 'PM MUDRA Yojana – Shishu (up to ₹50,000)',
    name_hi: 'प्रधानमंत्री मुद्रा योजना – शिशु',
    name_ta: 'பிரதமர் முத்ரா யோஜனா – சிசு',
    name_te: 'పీఎం ముద్రా యోజన – శిశు',
    name_kn: 'ಪಿಎಂ ಮುದ್ರಾ ಯೋಜನೆ – ಶಿಶು',
    name_mr: 'पीएम मुद्रा योजना – शिशू',
    name_bn: 'পিএম মুদ্রা যোজনা – শিশু',
    benefit: 'Collateral-free business loan up to ₹50,000 at concessional rates',
    ministry: 'Ministry of Finance / MUDRA',
    type: 'Loan / Credit',
    url: 'https://mudra.org.in',
    active: true
  };
MATCH (s6:Scheme {id:'MUDRA_SHISHU'}), (d:Department {id:'DEPT_FIN'})
  MERGE (s6)-[:OFFERED_BY]->(d);
MATCH (s6:Scheme {id:'MUDRA_SHISHU'}), (st:State {code:'ALL'})
  MERGE (s6)-[:AVAILABLE_IN]->(st);
MERGE (c6a:Criteria {id:'MUDRA_C1'})
  SET c6a += {field:'occupation', operator:'=', value:'business', label:'Self-employed / small business owner'};
MERGE (c6b:Criteria {id:'MUDRA_C2'})
  SET c6b += {field:'age_min', operator:'>=', value:'18', label:'Age 18 or above'};
MATCH (s6:Scheme {id:'MUDRA_SHISHU'}), (c:Criteria) WHERE c.id IN ['MUDRA_C1','MUDRA_C2']
  MERGE (s6)-[:REQUIRES]->(c);

// 3.7 PM Awas Yojana (Gramin) - PMAYG
MERGE (s7:Scheme {id:'PMAY_G'})
  SET s7 += {
    name: 'PM Awas Yojana – Gramin (Rural Housing)',
    name_hi: 'प्रधानमंत्री आवास योजना – ग्रामीण',
    name_ta: 'பிரதமர் ஆவாஸ் யோஜனா – கிராமம்',
    name_te: 'పీఎం ఆవాస్ యోజన – గ్రామీణ',
    name_kn: 'ಪಿಎಂ ಆವಾಸ್ ಯೋಜನೆ – ಗ್ರಾಮೀಣ',
    name_mr: 'पीएम आवास योजना – ग्रामीण',
    name_bn: 'পিএম আবাস যোজনা – গ্রামীণ',
    benefit: '₹1.20–1.30 lakh grant for construction of pucca house + ₹12,000 for toilet (SBMG)',
    ministry: 'Ministry of Rural Development',
    type: 'Direct Benefit Transfer',
    url: 'https://pmayg.nic.in',
    active: true
  };
MATCH (s7:Scheme {id:'PMAY_G'}), (d:Department {id:'DEPT_RURAL'})
  MERGE (s7)-[:OFFERED_BY]->(d);
MATCH (s7:Scheme {id:'PMAY_G'}), (st:State {code:'ALL'})
  MERGE (s7)-[:AVAILABLE_IN]->(st);
MERGE (c7a:Criteria {id:'PMAYG_C1'})
  SET c7a += {field:'bpl_card', operator:'=', value:'true', label:'BPL / SECC-listed household'};
MERGE (c7b:Criteria {id:'PMAYG_C2'})
  SET c7b += {field:'income_max', operator:'<=', value:'300000', label:'Annual income ≤ ₹3,00,000'};
MATCH (s7:Scheme {id:'PMAY_G'}), (c:Criteria) WHERE c.id IN ['PMAYG_C1','PMAYG_C2']
  MERGE (s7)-[:REQUIRES]->(c);

// 3.8 PM Ujjwala Yojana 2.0
MERGE (s8:Scheme {id:'PMUY'})
  SET s8 += {
    name: 'PM Ujjwala Yojana 2.0 (Free LPG Connection)',
    name_hi: 'प्रधानमंत्री उज्ज्वला योजना 2.0',
    name_ta: 'பிரதமர் உஜ்வலா யோஜனா 2.0',
    name_te: 'పీఎం ఉజ్వల యోజన 2.0',
    name_kn: 'ಪಿಎಂ ಉಜ್ಜ್ವಲ ಯೋಜನೆ 2.0',
    name_mr: 'पीएम उज्ज्वला योजना 2.0',
    name_bn: 'পিএম উজ্জ্বলা যোজনা 2.0',
    benefit: 'Free LPG gas connection + first refill cylinder free + 14 subsidised refills/year',
    ministry: 'Ministry of Petroleum & Natural Gas',
    type: 'Subsidy',
    url: 'https://pmuy.gov.in',
    active: true
  };
MATCH (s8:Scheme {id:'PMUY'}), (d:Department {id:'DEPT_WCD'})
  MERGE (s8)-[:OFFERED_BY]->(d);
MATCH (s8:Scheme {id:'PMUY'}), (st:State {code:'ALL'})
  MERGE (s8)-[:AVAILABLE_IN]->(st);
MERGE (c8a:Criteria {id:'PMUY_C1'})
  SET c8a += {field:'gender', operator:'=', value:'F', label:'Adult woman of household'};
MERGE (c8b:Criteria {id:'PMUY_C2'})
  SET c8b += {field:'bpl_card', operator:'=', value:'true', label:'BPL/SECC/OBC/SC/ST household'};
MATCH (s8:Scheme {id:'PMUY'}), (c:Criteria) WHERE c.id IN ['PMUY_C1','PMUY_C2']
  MERGE (s8)-[:REQUIRES]->(c);

// 3.9 PM Kisan Maan Dhan Yojana (Farmer pension)
MERGE (s9:Scheme {id:'PMKMY'})
  SET s9 += {
    name: 'PM Kisan Maan Dhan Yojana (Farmer Pension)',
    name_hi: 'प्रधानमंत्री किसान मान-धन योजना',
    name_ta: 'பிரதமர் கிசான் மான்-தன் யோஜனா',
    name_te: 'పీఎం కిసాన్ మాన్-ధన్ యోజన',
    name_kn: 'ಪಿಎಂ ಕಿಸಾನ್ ಮಾನ್-ಧನ್ ಯೋಜನೆ',
    name_mr: 'पीएम किसान मान-धन योजना',
    name_bn: 'পিএম কিষাণ মান-ধন যোজনা',
    benefit: '₹3,000/month pension after age 60 (contribution matched by government)',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    type: 'Savings Scheme',
    url: 'https://pmkmy.gov.in',
    active: true
  };
MATCH (s9:Scheme {id:'PMKMY'}), (d:Department {id:'DEPT_AGRI'})
  MERGE (s9)-[:OFFERED_BY]->(d);
MATCH (s9:Scheme {id:'PMKMY'}), (st:State {code:'ALL'})
  MERGE (s9)-[:AVAILABLE_IN]->(st);
MERGE (c9a:Criteria {id:'PMKMY_C1'})
  SET c9a += {field:'occupation', operator:'=', value:'farmer', label:'Small or marginal farmer'};
MERGE (c9b:Criteria {id:'PMKMY_C2'})
  SET c9b += {field:'age_min', operator:'>=', value:'18', label:'Age 18 or above'};
MERGE (c9c:Criteria {id:'PMKMY_C3'})
  SET c9c += {field:'age_max', operator:'<=', value:'40', label:'Age 40 or below (to enrol)'};
MERGE (c9d:Criteria {id:'PMKMY_C4'})
  SET c9d += {field:'land_acres', operator:'<=', value:'5', label:'Land holding up to 5 acres'};
MATCH (s9:Scheme {id:'PMKMY'}), (c:Criteria) WHERE c.id IN ['PMKMY_C1','PMKMY_C2','PMKMY_C3','PMKMY_C4']
  MERGE (s9)-[:REQUIRES]->(c);

// 3.10 PM KVY (Kaushal Vikas)
MERGE (s10:Scheme {id:'PMKVY'})
  SET s10 += {
    name: 'PM Kaushal Vikas Yojana 4.0 (Free Skill Training)',
    name_hi: 'प्रधानमंत्री कौशल विकास योजना 4.0',
    name_ta: 'பிரதமர் கௌஷல் விகாஸ் யோஜனா 4.0',
    name_te: 'పీఎం కౌశల్ వికాస్ యోజన 4.0',
    name_kn: 'ಪಿಎಂ ಕೌಶಲ ವಿಕಾಸ ಯೋಜನೆ 4.0',
    name_mr: 'पीएम कौशल्य विकास योजना 4.0',
    name_bn: 'পিএম কৌশল বিকাশ যোজনা 4.0',
    benefit: 'Free vocational training in 300+ job roles + certificate + ₹8,000 reward on placement',
    ministry: 'Ministry of Skill Development & Entrepreneurship',
    type: 'Skill Training',
    url: 'https://pmkvyofficial.org',
    active: true
  };
MATCH (s10:Scheme {id:'PMKVY'}), (d:Department {id:'DEPT_SKILL'})
  MERGE (s10)-[:OFFERED_BY]->(d);
MATCH (s10:Scheme {id:'PMKVY'}), (st:State {code:'ALL'})
  MERGE (s10)-[:AVAILABLE_IN]->(st);
MERGE (c10a:Criteria {id:'PMKVY_C1'})
  SET c10a += {field:'age_min', operator:'>=', value:'15', label:'Age 15 or above'};
MERGE (c10b:Criteria {id:'PMKVY_C2'})
  SET c10b += {field:'age_max', operator:'<=', value:'45', label:'Age 45 or below'};
MATCH (s10:Scheme {id:'PMKVY'}), (c:Criteria) WHERE c.id IN ['PMKVY_C1','PMKVY_C2']
  MERGE (s10)-[:REQUIRES]->(c);

// 3.11 National SC/ST Hub
MERGE (s11:Scheme {id:'NSCSTH'})
  SET s11 += {
    name: 'National SC ST Hub – MSME Support',
    name_hi: 'राष्ट्रीय अनुसूचित जाति-जनजाति हब',
    name_ta: 'தேசிய SC/ST தொழில் ஆதரவு இயக்கம்',
    name_te: 'జాతీయ SC/ST హబ్ – MSME సహాయం',
    name_kn: 'ರಾಷ್ಟ್ರೀಯ SC/ST ಹಬ್',
    name_mr: 'राष्ट्रीय SC/ST हब योजना',
    name_bn: 'জাতীয় SC/ST হাব – MSME সহায়তা',
    benefit: 'Business development support, subsidised credit, market access for SC/ST entrepreneurs',
    ministry: 'Ministry of MSME',
    type: 'Subsidy',
    url: 'https://www.scsthub.in',
    active: true
  };
MATCH (s11:Scheme {id:'NSCSTH'}), (d:Department {id:'DEPT_MSME'})
  MERGE (s11)-[:OFFERED_BY]->(d);
MATCH (s11:Scheme {id:'NSCSTH'}), (st:State {code:'ALL'})
  MERGE (s11)-[:AVAILABLE_IN]->(st);
MERGE (c11a:Criteria {id:'NSCSTH_C1'})
  SET c11a += {field:'caste', operator:'IN', value:'SC,ST', label:'SC or ST category'};
MERGE (c11b:Criteria {id:'NSCSTH_C2'})
  SET c11b += {field:'occupation', operator:'=', value:'business', label:'Entrepreneur / business owner'};
MATCH (s11:Scheme {id:'NSCSTH'}), (c:Criteria) WHERE c.id IN ['NSCSTH_C1','NSCSTH_C2']
  MERGE (s11)-[:REQUIRES]->(c);

// 3.12 Beti Bachao Beti Padhao - scholarship component
MERGE (s12:Scheme {id:'BBBP'})
  SET s12 += {
    name: 'Sukanya Samriddhi Yojana (Beti Bachao)',
    name_hi: 'सुकन्या समृद्धि योजना',
    name_ta: 'சுகன்யா சம்ரிட்தி யோஜனா',
    name_te: 'సుకన్య సమృద్ధి యోజన',
    name_kn: 'ಸುಕನ್ಯಾ ಸಮೃದ್ಧಿ ಯೋಜನೆ',
    name_mr: 'सुकन्या समृद्धी योजना',
    name_bn: 'সুকন্যা সমৃদ্ধি যোজনা',
    benefit: '8.2% interest p.a. savings scheme for girl child (tax-free maturity)',
    ministry: 'Ministry of Women & Child Development',
    type: 'Savings Scheme',
    url: 'https://www.india.gov.in/sukanya-samriddhi-yojana',
    active: true
  };
MATCH (s12:Scheme {id:'BBBP'}), (d:Department {id:'DEPT_WCD'})
  MERGE (s12)-[:OFFERED_BY]->(d);
MATCH (s12:Scheme {id:'BBBP'}), (st:State {code:'ALL'})
  MERGE (s12)-[:AVAILABLE_IN]->(st);
MERGE (c12a:Criteria {id:'BBBP_C1'})
  SET c12a += {field:'gender', operator:'=', value:'F', label:'Girl child (account opened by parent)'};
MATCH (s12:Scheme {id:'BBBP'}), (c:Criteria {id:'BBBP_C1'})
  MERGE (s12)-[:REQUIRES]->(c);

// 3.13 National Scholarship Portal - Pre-Matric SC
MERGE (s13:Scheme {id:'NSP_PREMATRIC_SC'})
  SET s13 += {
    name: 'Pre-Matric Scholarship for SC Students',
    name_hi: 'अनुसूचित जाति प्री-मैट्रिक छात्रवृत्ति',
    name_ta: 'SC மாணவர்களுக்கான பரீட்சைக்கு முந்தைய உதவித்தொகை',
    name_te: 'SC విద్యార్థులకు ప్రీ-మెట్రిక్ స్కాలర్‌షిప్',
    name_kn: 'SC ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪ್ರಿ-ಮೆಟ್ರಿಕ್ ವಿದ್ಯಾರ್ಥಿವೇತನ',
    name_mr: 'SC विद्यार्थ्यांसाठी प्री-मॅट्रिक शिष्यवृत्ती',
    name_bn: 'SC শিক্ষার্থীদের প্রি-ম্যাট্রিক বৃত্তি',
    benefit: '₹225–₹700/month scholarship + book allowance for classes 1-10',
    ministry: 'Ministry of Social Justice & Empowerment',
    type: 'Scholarship',
    url: 'https://scholarships.gov.in',
    active: true
  };
MATCH (s13:Scheme {id:'NSP_PREMATRIC_SC'}), (d:Department {id:'DEPT_EDU'})
  MERGE (s13)-[:OFFERED_BY]->(d);
MATCH (s13:Scheme {id:'NSP_PREMATRIC_SC'}), (st:State {code:'ALL'})
  MERGE (s13)-[:AVAILABLE_IN]->(st);
MERGE (c13a:Criteria {id:'NSP_SC_C1'})
  SET c13a += {field:'caste', operator:'IN', value:'SC', label:'SC category'};
MERGE (c13b:Criteria {id:'NSP_SC_C2'})
  SET c13b += {field:'income_max', operator:'<=', value:'250000', label:'Annual family income ≤ ₹2,50,000'};
MATCH (s13:Scheme {id:'NSP_PREMATRIC_SC'}), (c:Criteria) WHERE c.id IN ['NSP_SC_C1','NSP_SC_C2']
  MERGE (s13)-[:REQUIRES]->(c);

// 3.14 PMAY - Urban (Credit Linked Subsidy)
MERGE (s14:Scheme {id:'PMAY_U'})
  SET s14 += {
    name: 'PM Awas Yojana – Urban (CLSS Subsidy)',
    name_hi: 'प्रधानमंत्री आवास योजना – शहरी',
    name_ta: 'பிரதமர் ஆவாஸ் யோஜனா – நகரம்',
    name_te: 'పీఎం ఆవాస్ యోజన – అర్బన్',
    name_kn: 'ಪಿಎಂ ಆವಾಸ್ ಯೋಜನೆ – ನಗರ',
    name_mr: 'पीएम आवास योजना – शहरी',
    name_bn: 'পিএম আবাস যোজনা – শহর',
    benefit: 'Interest subsidy of 3–6.5% on home loans up to ₹12 lakh (saves ~₹2.6 lakh)',
    ministry: 'Ministry of Housing & Urban Affairs',
    type: 'Subsidy',
    url: 'https://pmaymis.gov.in',
    active: true
  };
MATCH (s14:Scheme {id:'PMAY_U'}), (d:Department {id:'DEPT_HOUSING'})
  MERGE (s14)-[:OFFERED_BY]->(d);
MATCH (s14:Scheme {id:'PMAY_U'}), (st:State {code:'ALL'})
  MERGE (s14)-[:AVAILABLE_IN]->(st);
MERGE (c14a:Criteria {id:'PMAY_U_C1'})
  SET c14a += {field:'income_max', operator:'<=', value:'1800000', label:'Annual income ≤ ₹18 lakh (MIG-II)'};
MATCH (s14:Scheme {id:'PMAY_U'}), (c:Criteria {id:'PMAY_U_C1'})
  MERGE (s14)-[:REQUIRES]->(c);

// 3.15 Saubhagya Free Electricity
MERGE (s15:Scheme {id:'SAUBHAGYA'})
  SET s15 += {
    name: 'PM Saubhagya – Free Household Electricity Connection',
    name_hi: 'प्रधानमंत्री सहज बिजली हर घर योजना',
    name_ta: 'பிரதமர் சௌபாக்கிய யோஜனா',
    name_te: 'పీఎం సౌభాగ్య – ఉచిత విద్యుత్ కనెక్షన్',
    name_kn: 'ಪಿಎಂ ಸೌಭಾಗ್ಯ ಯೋಜನೆ',
    name_mr: 'पीएम सौभाग्य योजना',
    name_bn: 'পিএম সৌভাগ্য যোজনা',
    benefit: 'Free electricity connection to unelectrified BPL households including wiring & LED bulbs',
    ministry: 'Ministry of Power',
    type: 'Direct Benefit Transfer',
    url: 'https://saubhagya.gov.in',
    active: true
  };
MATCH (s15:Scheme {id:'SAUBHAGYA'}), (d:Department {id:'DEPT_POWER'})
  MERGE (s15)-[:OFFERED_BY]->(d);
MATCH (s15:Scheme {id:'SAUBHAGYA'}), (st:State {code:'ALL'})
  MERGE (s15)-[:AVAILABLE_IN]->(st);
MERGE (c15a:Criteria {id:'SAUBHAGYA_C1'})
  SET c15a += {field:'bpl_card', operator:'=', value:'true', label:'BPL household'};
MATCH (s15:Scheme {id:'SAUBHAGYA'}), (c:Criteria {id:'SAUBHAGYA_C1'})
  MERGE (s15)-[:REQUIRES]->(c);

// ── 4. Sample Districts & CSCs ───────────────────────────────────────────────

// Districts
MERGE (dist_chen:District {id:'DIST_CHENNAI'})   SET dist_chen.name = 'Chennai';
MERGE (dist_vell:District {id:'DIST_VELLORE'})   SET dist_vell.name = 'Vellore';
MERGE (dist_luck:District {id:'DIST_LUCKNOW'})   SET dist_luck.name = 'Lucknow';
MERGE (dist_pune:District {id:'DIST_PUNE'})      SET dist_pune.name = 'Pune';
MERGE (dist_hyd:District {id:'DIST_HYD'})        SET dist_hyd.name  = 'Hyderabad';

// District → State relationships
MATCH (d:District {id:'DIST_CHENNAI'}), (s:State {code:'TN'})  MERGE (d)-[:PART_OF]->(s);
MATCH (d:District {id:'DIST_VELLORE'}),  (s:State {code:'TN'})  MERGE (d)-[:PART_OF]->(s);
MATCH (d:District {id:'DIST_LUCKNOW'}),  (s:State {code:'UP'})  MERGE (d)-[:PART_OF]->(s);
MATCH (d:District {id:'DIST_PUNE'}),     (s:State {code:'MH'})  MERGE (d)-[:PART_OF]->(s);
MATCH (d:District {id:'DIST_HYD'}),      (s:State {code:'TS'})  MERGE (d)-[:PART_OF]->(s);

// CSCs
MERGE (csc1:CSC {id:'CSC_TN_001'})
  SET csc1 += {name:'Arumbakkam CSC (Jan Seva Kendra)', phone:'044-23611234',
               timings:'Mon–Sat 9am–5pm', lat:13.0827, lng:80.2707};
MATCH (csc1:CSC {id:'CSC_TN_001'}), (d:District {id:'DIST_CHENNAI'}) MERGE (csc1)-[:LOCATED_IN]->(d);

MERGE (csc2:CSC {id:'CSC_TN_002'})
  SET csc2 += {name:'Vellore Town CSC', phone:'0416-2234567',
               timings:'Mon–Sat 9am–5pm', lat:12.9165, lng:79.1325};
MATCH (csc2:CSC {id:'CSC_TN_002'}), (d:District {id:'DIST_VELLORE'}) MERGE (csc2)-[:LOCATED_IN]->(d);

MERGE (csc3:CSC {id:'CSC_UP_001'})
  SET csc3 += {name:'Hazratganj CSC – Lucknow', phone:'0522-2611111',
               timings:'Mon–Fri 10am–4pm', lat:26.8467, lng:80.9462};
MATCH (csc3:CSC {id:'CSC_UP_001'}), (d:District {id:'DIST_LUCKNOW'}) MERGE (csc3)-[:LOCATED_IN]->(d);

MERGE (csc4:CSC {id:'CSC_MH_001'})
  SET csc4 += {name:'Shivajinagar Jan Seva Kendra', phone:'020-25535555',
               timings:'Mon–Sat 9am–6pm', lat:18.5204, lng:73.8567};
MATCH (csc4:CSC {id:'CSC_MH_001'}), (d:District {id:'DIST_PUNE'}) MERGE (csc4)-[:LOCATED_IN]->(d);

MERGE (csc5:CSC {id:'CSC_TS_001'})
  SET csc5 += {name:'Abids Mee-Seva Centre', phone:'040-23230789',
               timings:'Mon–Sat 9am–7pm', lat:17.3850, lng:78.4867};
MATCH (csc5:CSC {id:'CSC_TS_001'}), (d:District {id:'DIST_HYD'}) MERGE (csc5)-[:LOCATED_IN]->(d);

// ── 5. Add All remaining States & UTs ─────────────────────────────────────────
MERGE (s_ap:State {code:'AP'}) SET s_ap.name = 'Andhra Pradesh';
MERGE (s_ar:State {code:'AR'}) SET s_ar.name = 'Arunachal Pradesh';
MERGE (s_as:State {code:'AS'}) SET s_as.name = 'Assam';
MERGE (s_br:State {code:'BR'}) SET s_br.name = 'Bihar';
MERGE (s_cg:State {code:'CG'}) SET s_cg.name = 'Chhattisgarh';
MERGE (s_ga:State {code:'GA'}) SET s_ga.name = 'Goa';
MERGE (s_gj:State {code:'GJ'}) SET s_gj.name = 'Gujarat';
MERGE (s_hr:State {code:'HR'}) SET s_hr.name = 'Haryana';
MERGE (s_hp:State {code:'HP'}) SET s_hp.name = 'Himachal Pradesh';
MERGE (s_jh:State {code:'JH'}) SET s_jh.name = 'Jharkhand';
MERGE (s_ka:State {code:'KA'}) SET s_ka.name = 'Karnataka';
MERGE (s_kl:State {code:'KL'}) SET s_kl.name = 'Kerala';
MERGE (s_mp:State {code:'MP'}) SET s_mp.name = 'Madhya Pradesh';
MERGE (s_mh:State {code:'MH'}) SET s_mh.name = 'Maharashtra';
MERGE (s_mn:State {code:'MN'}) SET s_mn.name = 'Manipur';
MERGE (s_ml:State {code:'ML'}) SET s_ml.name = 'Meghalaya';
MERGE (s_mz:State {code:'MZ'}) SET s_mz.name = 'Mizoram';
MERGE (s_nl:State {code:'NL'}) SET s_nl.name = 'Nagaland';
MERGE (s_od:State {code:'OD'}) SET s_od.name = 'Odisha';
MERGE (s_pb:State {code:'PB'}) SET s_pb.name = 'Punjab';
MERGE (s_rj:State {code:'RJ'}) SET s_rj.name = 'Rajasthan';
MERGE (s_sk:State {code:'SK'}) SET s_sk.name = 'Sikkim';
MERGE (s_tn:State {code:'TN'}) SET s_tn.name = 'Tamil Nadu';
MERGE (s_ts:State {code:'TS'}) SET s_ts.name = 'Telangana';
MERGE (s_tr:State {code:'TR'}) SET s_tr.name = 'Tripura';
MERGE (s_up:State {code:'UP'}) SET s_up.name = 'Uttar Pradesh';
MERGE (s_uk:State {code:'UK'}) SET s_uk.name = 'Uttarakhand';
MERGE (s_wb:State {code:'WB'}) SET s_wb.name = 'West Bengal';
MERGE (s_dl:State {code:'DL'}) SET s_dl.name = 'Delhi';
MERGE (s_jk:State {code:'JK'}) SET s_jk.name = 'Jammu & Kashmir';
MERGE (s_la:State {code:'LA'}) SET s_la.name = 'Ladakh';
MERGE (s_an:State {code:'AN'}) SET s_an.name = 'Andaman & Nicobar';
MERGE (s_ch:State {code:'CH'}) SET s_ch.name = 'Chandigarh';
MERGE (s_dn:State {code:'DN'}) SET s_dn.name = 'Dadra & Nagar Haveli';
MERGE (s_dd:State {code:'DD'}) SET s_dd.name = 'Daman & Diu';
MERGE (s_ld:State {code:'LD'}) SET s_ld.name = 'Lakshadweep';
MERGE (s_py:State {code:'PY'}) SET s_py.name = 'Puducherry';

// ── 6. State Specific Welfare Schemes for Every State ──────────────────────────
UNWIND [
  {code:'AP', name:'Andhra Pradesh YSR Pension Kanuka', name_hi:'आंध्र प्रदेश वाईएसआर पेंशन कनुका', name_ta:'ஆந்திரா ஒய்.எஸ்.ஆர் ஓய்வூதியக் காணிக்கை', benefit:'₹3,000/month pension support for senior citizens, widows, and disabled'},
  {code:'AR', name:'Arunachal Pradesh Old Age Pension', name_hi:'अरुणाचल प्रदेश वृद्धावस्था पेंशन', name_ta:'அருணோச்சல பிரதேச முதியோர் ஓய்வூதியம்', benefit:'₹1,500/month for senior citizens above 60 years'},
  {code:'AS', name:'Assam Orunodoi Scheme', name_hi:'असम अरुणोदय योजना', name_ta:'அசாம் அருணோதய் திட்டம்', benefit:'₹1,250/month direct cash assistance to female heads of households'},
  {code:'BR', name:'Bihar Mukhyamantri Vriddhjan Pension', name_hi:'बिहार मुख्यमंत्री वृद्धजन पेंशन योजना', name_ta:'பீகார் முதியோர் ஓய்வூதியத் திட்டம்', benefit:'₹400-500/month pension for elderly people above 60 years'},
  {code:'CG', name:'Chhattisgarh Rajiv Gandhi Kisaan Nyay Yojana', name_hi:'छत्तीसगढ़ राजीव गांधी किसान न्याय योजना', name_ta:'சத்தீஸ்கர் ராஜீவ் காந்தி கிசான் நியாய திட்டம்', benefit:'₹9,000/acre input subsidy for crop cultivation support'},
  {code:'GA', name:'Goa Dayanand Social Security Scheme', name_hi:'गोवा दयानंद सामाजिक सुरक्षा योजना', name_ta:'கோவா தயானந்த் சமூக பாதுகாப்புத் திட்டம்', benefit:'₹2,000/month for senior citizens and single mothers'},
  {code:'GJ', name:'Gujarat Mukhyamantri Kisan Sahay Yojana', name_hi:'गुजरात मुख्यमंत्री किसान सहाय योजना', name_ta:'குஜராத் முதல்வர் கிசான் சகாய் யோஜனா', benefit:'₹20,000/hectare assistance for crop loss due to heavy rain'},
  {code:'HR', name:'Haryana Old Age Samman Allowance', name_hi:'हरियाणा वृद्धावस्था सम्मान भत्ता', name_ta:'ஹரியானா முதியோர் உதவித்தொகை', benefit:'₹2,750/month pension for senior citizens above 60 years'},
  {code:'HP', name:'Himachal Pradesh Sahara Yojana', name_hi:'हिमाचल प्रदेश सहारा योजना', name_ta:'இமாச்சல பிரதேச சஹாரா யோஜனா', benefit:'₹3,000/month financial assistance for patients with critical illnesses'},
  {code:'JH', name:'Jharkhand Mukhyamantri Sarvajan Pension', name_hi:'झारखंड मुख्यमंत्री सार्वजन पेंशन', name_ta:'ஜார்கண்ட் முதல்வர் பொது ஓய்வூதியத் திட்டம்', benefit:'₹1,000/month universal pension for all senior citizens'},
  {code:'KA', name:'Karnataka Gruha Lakshmi Scheme', name_hi:'कर्नाटक गृह लक्ष्मी योजना', name_ta:'கர்நாடகா கிருக லட்சுமி திட்டம்', benefit:'₹2,000/month financial support to female heads of families'},
  {code:'KL', name:'Kerala Karunya Benevolent Fund', name_hi:'केरल कारुण्या बेनेवोलेंट फंड', name_ta:'கேரளா காருண்யா நல நிதித் திட்டம்', benefit:'Up to ₹3 lakh free medical treatment support for poor families'},
  {code:'MP', name:'MP Ladli Behna Yojana', name_hi:'मध्य प्रदेश लाड़ली बहना योजना', name_ta:'மத்திய பிரதேச லாட்லி பெஹ்னா யோஜனா', benefit:'₹1,250/month direct cash benefit for eligible women'},
  {code:'MH', name:'Maharashtra Ladli Behna Yojana', name_hi:'महाराष्ट्र लाड़ली बहना योजना', name_ta:'மகாராஷ்டிரா லாட்லி பெஹ்னா யோஜனா', benefit:'₹1,500/month assistance for low-income women aged 21-65'},
  {code:'MN', name:'Manipur Chief Ministergi Hakshelgi Tengbang', name_hi:'मणिपुर मुख्यमंत्री हक्शेलगी तेंगबांग', name_ta:'மணிப்பூர் முதல்வர் மருத்துவ உதவித் திட்டம்', benefit:'₹2 lakh cashless medical cover per year for poor families'},
  {code:'ML', name:'Meghalaya FOCUS Scheme', name_hi:'मेघालय फोकस योजना', name_ta:'மேகாலயா போக்கஸ் திட்டம்', benefit:'₹5,000 direct financial support to producer households/farmers'},
  {code:'MZ', name:'Mizoram Health Care Scheme', name_hi:'मिजोरम स्वास्थ्य देखभाल योजना', name_ta:'மிஸோரம் சுகாதாரப் பாதுகாப்புத் திட்டம்', benefit:'Up to ₹2 lakh health insurance support per family annually'},
  {code:'NL', name:'Nagaland State Disability Pension', name_hi:'नागालैंड राज्य विकलांगता पेंशन', name_ta:'நாகாலாந்து மாநில மாற்றுத்திறனாளிகள் ஓய்வூதியம்', benefit:'₹1,000/month social security pension for disabled individuals'},
  {code:'OD', name:'Odisha Madhu Babu Pension Yojana', name_hi:'ओडिशा मधु बाबू पेंशन योजना', name_ta:'ஒடிசா மது பாபு ஓய்வூதிய யோஜனா', benefit:'₹500-900/month social security pension for elderly and widows'},
  {code:'PB', name:'Punjab Mai Bhago Chhatri Scheme', name_hi:'पंजाब माई भागो छात्र योजना', name_ta:'பஞ்சாப் மாய் பாகோ கல்வித் திட்டம்', benefit:'Free school transportation and bicycle distribution for girl students'},
  {code:'RJ', name:'Rajasthan Chiranjeevi Swasthya Bima', name_hi:'राजस्थान चिरंजीवी स्वास्थ्य बीमा योजना', name_ta:'ராஜஸ்தான் சிரஞ்சீவி காப்பீட்டுத் திட்டம்', benefit:'₹25 lakh/year cashless family health insurance cover'},
  {code:'SK', name:'Sikkim Aama Yojana', name_hi:'सिक्किम आमा योजना', name_ta:'சிக்கிம் ஆமா யோஜனா', benefit:'₹20,000/year financial assistance to all unemployed mothers'},
  {code:'TN', name:'Tamil Nadu Pudhumai Penn Scheme', name_hi:'தமிழ்நாடு புதுமைப் பெண் திட்டம்', name_ta:'தமிழ்நாடு புதுமைப் பெண் திட்டம்', benefit:'₹1,000/month to girls who studied in govt schools for higher education'},
  {code:'TS', name:'Telangana Rythu Bandhu Scheme', name_hi:'तेलंगाना रायथू बंधु योजना', name_ta:'தெலுங்கானா రైతు பந்து திட்டம்', benefit:'₹10,000/acre per year investment support for agriculture'},
  {code:'TR', name:'Tripura Mukhyamantri Chaa Sramik Kalyan Prakalpa', name_hi:'त्रिपुरा मुख्यमंत्री चा श्रमिक कल्याण प्रकल्प', name_ta:'திரிபுரா தேயிலை தொழிலாளர் நலத் திட்டம்', benefit:'Land allotment, housing assistance, and ration subsidies for tea workers'},
  {code:'UP', name:'UP Mukhyamantri Kanya Sumangala Yojana', name_hi:'उत्तर प्रदेश मुख्यमंत्री कन्या सुमंगला योजना', name_ta:'உத்தரபிரதேசம் கன்யா சுமங்கலா யோஜனா', benefit:'₹15,000 conditional cash transfer for education and girl welfare'},
  {code:'UK', name:'Uttarakhand Gaura Devi Kanya Dhan Yojana', name_hi:'उत्तराखंड गौरा देवी कन्या धन योजना', name_ta:'உத்தரகாண்ட் கௌரா தேவி கல்வித் திட்டம்', benefit:'₹50,000 grant for girls from BPL families upon passing 12th class'},
  {code:'WB', name:'West Bengal Lakshmir Bhandar Scheme', name_hi:'पश्चिम बंगाल लक्ष्मी भंडार योजना', name_ta:'மேற்கு வங்க லட்சுமியின் பண்டார திட்டம்', benefit:'₹1,000-1,200/month basic income support to women of households'},
  {code:'DL', name:'Delhi Ladli Scheme', name_hi:'दिल्ली लाड़ली योजना', name_ta:'டெல்லி லாட்லி திட்டம்', benefit:'Up to ₹35,000 financial support for education of girls'},
  {code:'JK', name:'Jammu Kashmir Integrated Social Security', name_hi:'जम्मू कश्मीर एकीकृत सामाजिक सुरक्षा', name_ta:'ஜம்மு காஷ்மீர் சமூக பாதுகாப்புத் திட்டம்', benefit:'₹1,000/month assistance for senior citizens and destitute women'},
  {code:'LA', name:'Ladakh Old Age Pension Scheme', name_hi:'लद्दाख वृद्धावस्था पेंशन योजना', name_ta:'லடாக் முதியோர் ஓய்வூதியத் திட்டம்', benefit:'₹1,000/month financial aid for elderly citizens'},
  {code:'AN', name:'Andaman and Nicobar Pension for Widows', name_hi:'अंडमान और निकोबार विधवा पेंशन', name_ta:'அந்தமான் நிக்கோபார் விதவை ஓய்வூதியம்', benefit:'₹2,500/month pension allowance for low income widows'},
  {code:'CH', name:'Chandigarh Social Security Pension', name_hi:'चंडीगढ़ सामाजिक सुरक्षा पेंशन', name_ta:'சண்டிகர் சமூக பாதுகாப்புத் திட்டம்', benefit:'₹2,000/month pension for elderly and disabled residents'},
  {code:'DN', name:'Dadra Nagar Haveli Old Age Pension', name_hi:'दादरा नगर हवेली वृद्धावस्था पेंशन', name_ta:'தாத்ரா நகர் ஹவேலி முதியோர் ஓய்வூதியம்', benefit:'₹1,500/month assistance for elderly individuals'},
  {code:'DD', name:'Daman Diu Pension for Destitute', name_hi:'दमन दीव निराश्रित पेंशन', name_ta:'தாமன் தியூ ஆதரவற்றோர் ஓய்வூதியம்', benefit:'₹2,000/month allowance for disabled and senior citizens'},
  {code:'LD', name:'Lakshadweep Social Pension Welfare', name_hi:'लक्षद्वीप सामाजिक पेंशन कल्याण', name_ta:'லட்சத்தீவு சமூக ஓய்வூதியத் திட்டம்', benefit:'₹1,500/month welfare pension for low income households'},
  {code:'PY', name:'Puducherry Old Age Pension Scheme', name_hi:'पुदुचेरी वृद्धावस्था पेंशन योजना', name_ta:'புதுச்சேரி முதியோர் ஓய்வூதியத் திட்டம்', benefit:'₹2,000-3,500/month pension based on age bracket'}
] AS row
MATCH (st:State {code: row.code})
MERGE (s:Scheme {id: 'STATE_SCH_PENSION_' + row.code})
SET s += {
  name: row.name,
  name_hi: row.name_hi,
  name_ta: row.name_ta,
  benefit: row.benefit,
  ministry: 'State Welfare Department',
  type: 'State Welfare Scheme',
  url: 'https://india.gov.in',
  active: true
}
MERGE (s)-[:AVAILABLE_IN]->(st)
WITH s
MERGE (c:Criteria {id: s.id + '_C1'})
SET c += {field:'income_max', operator:'<=', value:'300000', label:'Annual family income ≤ ₹3,00,000'}
MERGE (s)-[:REQUIRES]->(c);

RETURN 'Seed complete ✓' AS status;
