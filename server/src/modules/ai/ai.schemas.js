/**
 * OpenAI Structured Outputs şemaları.
 *
 * Kurallar:
 * - Her object içinde additionalProperties: false bulunur.
 * - Strict schema uyumluluğu için bütün property alanları required listesine eklenir.
 * - Opsiyonel değerler null kabul edecek şekilde tanımlanır.
 * - Prompt veya iş mantığı bu dosyada tutulmaz.
 */

const nullableString = {
  anyOf: [
    { type: 'string' },
    { type: 'null' },
  ],
};

const nullableNumber = {
  anyOf: [
    { type: 'number' },
    { type: 'null' },
  ],
};

const stringArray = {
  type: 'array',
  items: {
    type: 'string',
  },
};

const sourceReferenceSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pageNumber: {
      anyOf: [
        {
          type: 'integer',
          minimum: 1,
        },
        {
          type: 'null',
        },
      ],
    },
    section: nullableString,
    excerpt: {
      type: 'string',
      description:
        'Kaynak metinden kısa ve doğrudan ilgili bölüm. Gereksiz uzun alıntı yapılmaz.',
    },
  },
  required: [
    'pageNumber',
    'section',
    'excerpt',
  ],
};

const partySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
    },
    role: {
      type: 'string',
      enum: [
        'davacı',
        'davalı',
        'başvurucu',
        'karşı_taraf',
        'müşteki',
        'sanık',
        'şüpheli',
        'tanık',
        'bilirkişi',
        'vekil',
        'kurum',
        'diğer',
        'belirsiz',
      ],
    },
    identifier: nullableString,
    representative: nullableString,
    description: nullableString,
  },
  required: [
    'name',
    'role',
    'identifier',
    'representative',
    'description',
  ],
};

const dateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    date: {
      type: 'string',
      description:
        'Mümkünse ISO 8601 biçiminde YYYY-MM-DD. Belirsizse belgede geçtiği biçim.',
    },
    label: {
      type: 'string',
    },
    importance: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
    },
    deadline: {
      type: 'boolean',
    },
    explanation: nullableString,
    source: sourceReferenceSchema,
  },
  required: [
    'date',
    'label',
    'importance',
    'deadline',
    'explanation',
    'source',
  ],
};

const amountSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    amount: nullableNumber,
    currency: nullableString,
    originalText: {
      type: 'string',
    },
    description: nullableString,
    source: sourceReferenceSchema,
  },
  required: [
    'amount',
    'currency',
    'originalText',
    'description',
    'source',
  ],
};

const riskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
    },
    level: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
    },
    category: {
      type: 'string',
      enum: [
        'procedural',
        'financial',
        'contractual',
        'evidentiary',
        'deadline',
        'compliance',
        'privacy',
        'enforcement',
        'other',
      ],
    },
    description: {
      type: 'string',
    },
    recommendation: {
      type: 'string',
    },
    source: sourceReferenceSchema,
  },
  required: [
    'title',
    'level',
    'category',
    'description',
    'recommendation',
    'source',
  ],
};

export const documentAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentType: {
      type: 'string',
      enum: [
        'dava_dilekçesi',
        'cevap_dilekçesi',
        'mahkeme_kararı',
        'ara_karar',
        'bilirkişi_raporu',
        'sözleşme',
        'ihtarname',
        'tebligat',
        'tutanak',
        'vekaletname',
        'delil',
        'yazışma',
        'icra_belgesi',
        'ceza_dosyası_belgesi',
        'idari_belge',
        'diğer',
        'belirsiz',
      ],
    },

    title: nullableString,

    language: {
      type: 'string',
    },

    summary: {
      type: 'string',
      description:
        'Belgenin tarafsız, açık ve kısa özeti.',
    },

    caseType: nullableString,

    jurisdiction: nullableString,

    court: nullableString,

    caseNumber: nullableString,

    decisionNumber: nullableString,

    parties: {
      type: 'array',
      items: partySchema,
    },

    importantDates: {
      type: 'array',
      items: dateSchema,
    },

    amounts: {
      type: 'array',
      items: amountSchema,
    },

    claims: stringArray,

    defenses: stringArray,

    obligations: stringArray,

    evidence: stringArray,

    legalIssues: stringArray,

    referencedLaws: stringArray,

    risks: {
      type: 'array',
      items: riskSchema,
    },

    missingInformation: stringArray,

    recommendedActions: stringArray,

    overallRiskLevel: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
        'undetermined',
      ],
    },

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    reviewReasons: stringArray,

    warnings: stringArray,
  },

  required: [
    'documentType',
    'title',
    'language',
    'summary',
    'caseType',
    'jurisdiction',
    'court',
    'caseNumber',
    'decisionNumber',
    'parties',
    'importantDates',
    'amounts',
    'claims',
    'defenses',
    'obligations',
    'evidence',
    'legalIssues',
    'referencedLaws',
    'risks',
    'missingInformation',
    'recommendedActions',
    'overallRiskLevel',
    'confidence',
    'requiresHumanReview',
    'reviewReasons',
    'warnings',
  ],
};

export const caseSummarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
    },

    overview: {
      type: 'string',
    },

    caseType: nullableString,

    currentStatus: {
      type: 'string',
    },

    parties: {
      type: 'array',
      items: partySchema,
    },

    keyFacts: stringArray,

    legalIssues: stringArray,

    claims: stringArray,

    defenses: stringArray,

    evidenceSummary: stringArray,

    proceduralHistory: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: nullableString,
          event: {
            type: 'string',
          },
          importance: {
            type: 'string',
            enum: [
              'low',
              'medium',
              'high',
              'critical',
            ],
          },
        },
        required: [
          'date',
          'event',
          'importance',
        ],
      },
    },

    upcomingDeadlines: {
      type: 'array',
      items: dateSchema,
    },

    risks: {
      type: 'array',
      items: riskSchema,
    },

    missingEvidence: stringArray,

    recommendedActions: stringArray,

    strategicConsiderations: stringArray,

    overallRiskLevel: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
        'critical',
        'undetermined',
      ],
    },

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresHumanReview: {
      type: 'boolean',
    },

    warnings: stringArray,
  },

  required: [
    'title',
    'overview',
    'caseType',
    'currentStatus',
    'parties',
    'keyFacts',
    'legalIssues',
    'claims',
    'defenses',
    'evidenceSummary',
    'proceduralHistory',
    'upcomingDeadlines',
    'risks',
    'missingEvidence',
    'recommendedActions',
    'strategicConsiderations',
    'overallRiskLevel',
    'confidence',
    'requiresHumanReview',
    'warnings',
  ],
};

export const entityExtractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    persons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          role: nullableString,
          identifier: nullableString,
        },
        required: [
          'name',
          'role',
          'identifier',
        ],
      },
    },

    organizations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          role: nullableString,
          identifier: nullableString,
        },
        required: [
          'name',
          'role',
          'identifier',
        ],
      },
    },

    dates: {
      type: 'array',
      items: dateSchema,
    },

    amounts: {
      type: 'array',
      items: amountSchema,
    },

    locations: stringArray,

    courts: stringArray,

    caseNumbers: stringArray,

    legalTerms: stringArray,

    referencedLaws: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },

  required: [
    'persons',
    'organizations',
    'dates',
    'amounts',
    'locations',
    'courts',
    'caseNumbers',
    'legalTerms',
    'referencedLaws',
    'confidence',
  ],
};

export const legalResearchSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    question: {
      type: 'string',
    },

    shortAnswer: {
      type: 'string',
    },

    analysis: {
      type: 'string',
    },

    applicablePrinciples: stringArray,

    referencedLegislation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          article: nullableString,
          relevance: {
            type: 'string',
          },
          verificationRequired: {
            type: 'boolean',
          },
        },
        required: [
          'name',
          'article',
          'relevance',
          'verificationRequired',
        ],
      },
    },

    factualAssumptions: stringArray,

    risks: {
      type: 'array',
      items: riskSchema,
    },

    recommendedActions: stringArray,

    missingInformation: stringArray,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    requiresLawyerReview: {
      type: 'boolean',
    },

    disclaimer: {
      type: 'string',
    },
  },

  required: [
    'question',
    'shortAnswer',
    'analysis',
    'applicablePrinciples',
    'referencedLegislation',
    'factualAssumptions',
    'risks',
    'recommendedActions',
    'missingInformation',
    'confidence',
    'requiresLawyerReview',
    'disclaimer',
  ],
};

export const documentClassificationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: [
        'petition',
        'court_decision',
        'interim_decision',
        'expert_report',
        'notification',
        'evidence',
        'correspondence',
        'contract',
        'notice',
        'power_of_attorney',
        'enforcement_document',
        'other',
        'unknown',
      ],
    },

    subcategory: nullableString,

    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },

    explanation: {
      type: 'string',
    },

    requiresHumanReview: {
      type: 'boolean',
    },
  },

  required: [
    'category',
    'subcategory',
    'confidence',
    'explanation',
    'requiresHumanReview',
  ],
};

export const draftGenerationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentType: {
      type: 'string',
      enum: [
        'petition',
        'contract',
        'notice',
      ],
    },

    title: {
      type: 'string',
    },

    draft: {
      type: 'string',
    },

    missingFields: stringArray,

    assumptions: stringArray,

    warnings: stringArray,

    requiresLawyerReview: {
      type: 'boolean',
    },
  },

  required: [
    'documentType',
    'title',
    'draft',
    'missingFields',
    'assumptions',
    'warnings',
    'requiresLawyerReview',
  ],
};

export const AI_SCHEMAS = Object.freeze({
  documentAnalysis: documentAnalysisSchema,
  caseSummary: caseSummarySchema,
  entityExtraction: entityExtractionSchema,
  legalResearch: legalResearchSchema,
  documentClassification: documentClassificationSchema,
  draftGeneration: draftGenerationSchema,
});

export default AI_SCHEMAS;