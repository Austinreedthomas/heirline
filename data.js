// FAKE sample "custodian network". No real people or SSNs.
const CUSTODIANS = {
 fidelity:{name:"Fidelity",url:"https://digital.fidelity.com/prgw/digital/journeys/loss/report-a-death",
  steps:["Report the death online with the deceased's SSN at Fidelity's death-notification page.","Fidelity mails a claim letter and beneficiary claim form; return by mail or upload in the NetBenefits app.","Get a medallion signature guarantee if the claim letter asks (a notary stamp does NOT count).","Some workplace 401(k)s also need plan-sponsor approval."],
  docs:["Certified death certificate","Completed Fidelity beneficiary claim form","Medallion signature guarantee (if required)","Plan-sponsor approval (some 401(k)s)","Proof of authority if signing for someone (POA, guardianship)"]},
 vanguard:{name:"Vanguard",url:"https://investor.vanguard.com/inheriting-accounts",
  steps:["If you're the named beneficiary or executor, start the inheritance transfer online.","Otherwise call 877-662-7447 (say \"change of ownership\") or request the paper kit.","Upload or mail a certified death certificate.","Estates must provide a current court appointment."],
  docs:["Certified death certificate","Deceased's date of birth and date of death","Inherited IRA application (for IRAs)","Court appointment / letters (if claiming for an estate)"]},
 schwab:{name:"Schwab",url:"https://www.schwab.com/life-events/losing-a-loved-one",
  steps:["Report the death online (name + SSN is enough to start).","Upload the death certificate; Schwab verifies it in about 5 business days.","Complete your to-do list in Schwab's Inheritance Center.","Transfers usually take a few weeks."],
  docs:["Certified death certificate","Affidavit of domicile (may be required, notarized)","State tax waiver (if your state requires it)","Schwab account application for the inherited account"]},
 empower:{name:"Empower (401k)",url:"https://www.empower.com/beneficiary-claim",
  steps:["Submit Empower's death notification form with the death certificate, or call 866-442-3888.","Empower secures the account and sets up accounts in each beneficiary's name.","Request a distribution from your beneficiary account.","Processing takes about one month after all documents arrive."],
  docs:["Certified death certificate","Death notification form","Beneficiary distribution election"]},
 healthequity:{name:"HealthEquity (HSA)",url:"https://www.healthequity.com/help-center/articles/6026409-hsa-account-management",
  steps:["Complete the HSA \"Instructions Upon Death\" form.","Send it with a death certificate.","A spouse can move the HSA into their own HSA; anyone else receives a check.","No beneficiary and no spouse: estate papers or a small-estate affidavit are needed."],
  docs:["Certified death certificate","HSA Instructions Upon Death form","Guardianship papers (minor beneficiary)","Estate papers or small-estate affidavit (no beneficiary/spouse)"]},
 coinbase:{name:"Coinbase",url:"https://help.coinbase.com/en/coinbase/managing-my-account/other/how-do-i-gain-access-to-a-deceased-family-members-coinbase-account",
  steps:["Coinbase has NO beneficiary option; the claim always goes through the estate.","The person named in the probate papers signs in to (or creates) their own Coinbase account.","Open the Executor Services form and upload the documents.","Generate the verification code and follow the instructions."],
  docs:["Official death certificate","Probate papers (letters testamentary/administration) or small-estate affidavit","Current government photo ID for each person named in the probate papers","Signed letter naming the destination Coinbase account and its email"]}
};
const PEOPLE = [
 {first:"Margaret",last:"Sample",dob:"1948-03-12",dod:"2026-08-30",ssn4:"4821",state:"FL",
  accounts:[{c:"fidelity",type:"Traditional IRA",bal:"$100k–$250k",bens:["Daniel Sample"]},{c:"vanguard",type:"Roth IRA",bal:"$50k–$100k",bens:["Daniel Sample","Ruth Sample"]},{c:"healthequity",type:"HSA",bal:"$5k–$25k",bens:["Robert Sample"]},{c:"coinbase",type:"Crypto exchange account",bal:"$10k–$50k",bens:[]}]},
 {first:"Robert",last:"Testman",dob:"1955-07-04",dod:"2026-06-15",ssn4:"1234",state:"TX",
  accounts:[{c:"empower",type:"401(k)",bal:"$250k–$500k",bens:["Linda Testman"]},{c:"schwab",type:"Brokerage (TOD)",bal:"$50k–$100k",bens:["Linda Testman"]}]},
 {first:"Alice",last:"Example",dob:"1962-11-20",dod:"2026-09-02",ssn4:"5555",state:"CA",
  accounts:[{c:"schwab",type:"Rollover IRA",bal:"$100k–$250k",bens:["Ben Example"]},{c:"coinbase",type:"Crypto exchange account",bal:"$1k–$10k",bens:[]},{c:"healthequity",type:"HSA",bal:"$1k–$5k",bens:[]}]},
 {first:"George",last:"Demo",dob:"1940-01-30",dod:"2026-05-11",ssn4:"9090",state:"NY",
  accounts:[{c:"vanguard",type:"Traditional IRA",bal:"$250k–$500k",bens:["Estate of George Demo"]},{c:"fidelity",type:"401(k)",bal:"$50k–$100k",bens:["Helen Demo"]}]},
 {first:"Maria",last:"Placeholder",dob:"1970-04-18",dod:"2026-07-21",ssn4:"2468",state:"FL",
  accounts:[{c:"empower",type:"401(k)",bal:"$25k–$50k",bens:["Carlos Placeholder"]},{c:"healthequity",type:"HSA",bal:"$5k–$25k",bens:["Carlos Placeholder"]},{c:"coinbase",type:"Crypto exchange account",bal:"$50k–$100k",bens:[]}]},
 {first:"Thomas",last:"Fakeson",dob:"1951-09-09",dod:"2026-04-03",ssn4:"1357",state:"OH",
  accounts:[{c:"fidelity",type:"Brokerage (TOD)",bal:"$10k–$50k",bens:["Amy Fakeson"]},{c:"schwab",type:"Traditional IRA",bal:"$100k–$250k",bens:["Amy Fakeson"]},{c:"vanguard",type:"SEP IRA",bal:"$25k–$50k",bens:[]}]},
 {first:"Evelyn",last:"Mockridge",dob:"1945-12-01",dod:"2026-03-14",ssn4:"8642",state:"PA",
  accounts:[{c:"vanguard",type:"Inherited IRA",bal:"$10k–$50k",bens:["Paul Mockridge"]}]},
 {first:"James",last:"Sampleton",dob:"1958-02-22",dod:"2026-10-01",ssn4:"7777",state:"GA",
  accounts:[{c:"empower",type:"401(k)",bal:"$100k–$250k",bens:["Grace Sampleton"]},{c:"fidelity",type:"Roth IRA",bal:"$25k–$50k",bens:["Grace Sampleton"]},{c:"coinbase",type:"Crypto exchange account",bal:"$1k–$10k",bens:[]}]}
];
const STATE_SITES = {FL:"https://www.fltreasurehunt.gov",TX:"https://www.claimittexas.gov",CA:"https://ucpi.sco.ca.gov",NY:"https://www.osc.ny.gov/unclaimed-funds",OH:"https://unclaimedfunds.ohio.gov",PA:"https://www.patreasury.gov/unclaimed-property/",GA:"https://gaclaims.unclaimedproperty.com"};
const SAMPLE_TEXTS = {
 "1099R_Fidelity_2025.txt": "FORM 1099-R  2025  Distributions From Pensions, Annuities, Retirement or Profit-Sharing Plans, IRAs\nPAYER: Fidelity Investments, PO Box 770002, Cincinnati OH 45277\nRECIPIENT: MARGARET A. SAMPLE   Recipient TIN: XXX-XX-4821\nAccount number: Z12-345678 (Traditional IRA)\nBox 1 Gross distribution: 12,400.00   Box 7 Distribution code: 7\nSAMPLE DOCUMENT - NOT REAL\n",
 "5498SA_HealthEquity_2025.txt": "FORM 5498-SA  2025  HSA, Archer MSA, or Medicare Advantage MSA Information\nTRUSTEE: HealthEquity, Inc., Draper UT\nPARTICIPANT: MARGARET A. SAMPLE   TIN: XXX-XX-4821\nAccount number: HE-55512 Health Savings Account (HSA)\nBox 5 Fair market value of HSA: 9,870.12\nSAMPLE DOCUMENT - NOT REAL\n",
 "5498_Vanguard_2025.txt": "FORM 5498  2025  IRA Contribution Information\nTRUSTEE: The Vanguard Group, Inc., Valley Forge PA\nPARTICIPANT: MARGARET A. SAMPLE   TIN: XXX-XX-4821\nAccount number: 8899-0011 Roth IRA\nBox 5 Fair market value of account: 84,210.55\nSAMPLE DOCUMENT - NOT REAL\n",
 "Coinbase_Statement_2025.txt": "Coinbase, Inc.  Annual Account Statement 2025\nAccount holder: Margaret A. Sample   Email: m.sample@example.com\nAccount ID: CB-7f3a91\nHoldings: 0.42 BTC, 3.1 ETH, 1,200 USDC\nSAMPLE DOCUMENT - NOT REAL\n"
};
const SAMPLE_DOCS = ["1099R_Fidelity_2025.txt","5498_Vanguard_2025.txt","5498SA_HealthEquity_2025.txt","Coinbase_Statement_2025.txt"];
