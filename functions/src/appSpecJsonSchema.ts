type JsonSchema = Record<string, unknown>

const nullableString: JsonSchema = { type: ['string', 'null'] }
const nullableNumber: JsonSchema = { type: ['number', 'null'] }
const nullableBoolean: JsonSchema = { type: ['boolean', 'null'] }

const selectOptionSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['id', 'label', 'value'],
}

const dataStoreSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['entries', 'history', 'list', 'table'] },
  },
  required: ['id', 'name', 'type'],
}

const entryFieldSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    inputType: {
      type: 'string',
      enum: ['text', 'number', 'date', 'textarea', 'select'],
    },
    placeholder: nullableString,
    options: {
      type: 'array',
      items: selectOptionSchema,
    },
  },
  required: ['id', 'label', 'inputType', 'placeholder', 'options'],
}

const runtimeValueSchema: JsonSchema = {
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'array', items: { type: 'string' } },
  ],
}

const buttonActionSchema: JsonSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['clearValues'] },
        blockIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'blockIds'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['setValue'] },
        targetBlockId: { type: 'string' },
        value: runtimeValueSchema,
      },
      required: ['type', 'targetBlockId', 'value'],
    },
  ],
}

const computedOperationSchema: JsonSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
        },
        inputIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'inputIds'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['concat'] },
        inputIds: { type: 'array', items: { type: 'string' } },
        separator: nullableString,
      },
      required: ['type', 'inputIds', 'separator'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['countChecked'] },
        inputId: { type: 'string' },
      },
      required: ['type', 'inputId'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['randomChoice'] },
        sourceId: { type: 'string' },
      },
      required: ['type', 'sourceId'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['pace'] },
        distanceInputId: { type: 'string' },
        minutesInputId: { type: 'string' },
      },
      required: ['type', 'distanceInputId', 'minutesInputId'],
    },
  ],
}

const blockSchema = (
  type: string,
  properties: JsonSchema,
  required: string[],
): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: [type] },
    label: nullableString,
    helpText: nullableString,
    ...properties,
  },
  required: ['id', 'type', 'label', 'helpText', ...required],
})

const appBlockSchema: JsonSchema = {
  anyOf: [
    blockSchema(
      'heading',
      {
        text: { type: 'string' },
        level: { type: 'integer', enum: [1, 2] },
      },
      ['text', 'level'],
    ),
    blockSchema('paragraph', { text: { type: 'string' } }, ['text']),
    blockSchema(
      'textInput',
      {
        placeholder: nullableString,
        defaultValue: nullableString,
      },
      ['placeholder', 'defaultValue'],
    ),
    blockSchema(
      'numberInput',
      {
        placeholder: nullableString,
        defaultValue: nullableNumber,
        unit: nullableString,
      },
      ['placeholder', 'defaultValue', 'unit'],
    ),
    blockSchema(
      'textarea',
      {
        placeholder: nullableString,
        defaultValue: nullableString,
      },
      ['placeholder', 'defaultValue'],
    ),
    blockSchema(
      'select',
      {
        options: { type: 'array', items: selectOptionSchema },
        defaultValue: nullableString,
      },
      ['options', 'defaultValue'],
    ),
    blockSchema(
      'checkbox',
      {
        text: { type: 'string' },
        defaultValue: nullableBoolean,
      },
      ['text', 'defaultValue'],
    ),
    blockSchema(
      'checkboxList',
      {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['id', 'label'],
          },
        },
      },
      ['items'],
    ),
    blockSchema(
      'button',
      {
        text: { type: 'string' },
        action: buttonActionSchema,
      },
      ['text', 'action'],
    ),
    blockSchema(
      'computedValue',
      {
        operation: computedOperationSchema,
        resultLabel: nullableString,
        precision: nullableNumber,
      },
      ['operation', 'resultLabel', 'precision'],
    ),
    blockSchema(
      'savedEntryList',
      {
        storeId: { type: 'string' },
        fields: { type: 'array', items: entryFieldSchema },
        submitLabel: nullableString,
        emptyText: nullableString,
      },
      ['storeId', 'fields', 'submitLabel', 'emptyText'],
    ),
    blockSchema(
      'listEditor',
      {
        placeholder: nullableString,
        addLabel: nullableString,
        defaultItems: { type: 'array', items: { type: 'string' } },
      },
      ['placeholder', 'addLabel', 'defaultItems'],
    ),
    blockSchema(
      'randomizer',
      {
        sourceBlockIds: { type: 'array', items: { type: 'string' } },
        buttonLabel: nullableString,
        resultLabel: nullableString,
      },
      ['sourceBlockIds', 'buttonLabel', 'resultLabel'],
    ),
    blockSchema(
      'simpleTable',
      {
        storeId: { type: 'string' },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              fieldId: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['fieldId', 'label'],
          },
        },
        emptyText: nullableString,
      },
      ['storeId', 'columns', 'emptyText'],
    ),
  ],
}

const screenSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: nullableString,
    blocks: {
      type: 'array',
      items: appBlockSchema,
    },
  },
  required: ['id', 'title', 'description', 'blocks'],
}

const appSpecSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    category: {
      type: 'string',
      enum: [
        'calculator',
        'checklist',
        'tracker',
        'planner',
        'routine',
        'reference',
        'study',
        'restaurant',
        'decision',
        'custom',
      ],
    },
    icon: { type: 'string' },
    version: { type: 'integer' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    dataStores: {
      type: 'array',
      items: dataStoreSchema,
    },
    screens: {
      type: 'array',
      items: screenSchema,
    },
  },
  required: [
    'id',
    'name',
    'description',
    'category',
    'icon',
    'version',
    'createdAt',
    'updatedAt',
    'dataStores',
    'screens',
  ],
}

export const appForgeGenerationJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    appSpec: appSpecSchema,
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['appSpec', 'warnings'],
}
