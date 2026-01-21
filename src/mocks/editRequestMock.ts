export const editRequestMockResponse = {
  "requestDetails": {
    "requestName": "asal",
    "createdBy": "system",
    "updatedBy": "system",
    "requestType": "A",
    "sendNotificationOn": "S",
    "recipientEmail": "vatsav"
  },
  "inputSources": [
    {
      "sourceName": "ALL_PROFILE_TABLE_1",
      "sourceType": "T",
      "columnSelectionType": "A",
      "columns": [
        "COUNTRY",
        "PROFILE_ID",
        "CREATION_TS",
        "MODIFIED_TS",
        "EMAIL_DOMAIN",
        "EMAIL_ADDRESS_MD5",
        "GLOBALLY_SUPPRESSED_IND"
      ],
      "selectedColumns": "COUNTRY,PROFILE_ID,CREATION_TS,MODIFIED_TS,EMAIL_DOMAIN,EMAIL_ADDRESS_MD5,GLOBALLY_SUPPRESSED_IND",
      "inputType": "I",
      "filters": "",
      "filterJson": null,
      "isCustomTable": 0,
      "stepOrder": 1,
      "internalStepOrder": 1,
      "tableName": "ALL_PROFILE_TABLE",
      "sourceOption": 1
    },
    {
      "sourceName": "ALL_PROFILE_TABLE_2",
      "sourceType": "T",
      "columnSelectionType": "S",
      "columns": [
        "COUNTRY",
        "PROFILE_ID",
        "CREATION_TS",
        "MODIFIED_TS",
        "EMAIL_DOMAIN",
        "EMAIL_ADDRESS_MD5",
        "GLOBALLY_SUPPRESSED_IND"
      ],
      "selectedColumns": "COUNTRY",
      "inputType": "I",
      "filters": "",
      "filterJson": null,
      "isCustomTable": 0,
      "stepOrder": 1,
      "internalStepOrder": 2,
      "tableName": "ALL_PROFILE_TABLE",
      "sourceOption": 1
    },
    {
      "sourceName": "ALL_PROFILE_TABLE_31",
      "sourceType": "T",
      "columnSelectionType": "A",
      "columns": [
        "COUNTRY",
        "PROFILE_ID",
        "CREATION_TS",
        "MODIFIED_TS",
        "EMAIL_DOMAIN",
        "EMAIL_ADDRESS_MD5",
        "GLOBALLY_SUPPRESSED_IND"
      ],
      "selectedColumns": "COUNTRY,PROFILE_ID,CREATION_TS,MODIFIED_TS,EMAIL_DOMAIN,EMAIL_ADDRESS_MD5,GLOBALLY_SUPPRESSED_IND",
      "inputType": "A",
      "filters": "",
      "filterJson": null,
      "isCustomTable": 0,
      "stepOrder": 2,
      "internalStepOrder": 1,
      "tableName": "ALL_PROFILE_TABLE",
      "sourceOption": 1
    }
  ],
  "workflow": [
    {
      "stepOrder": 1,
      "internalStepOrder": 1,
      "actionType": "I",
      "configJson": {
        "input_sources": [
          "ALL_PROFILE_TABLE_1"
        ]
      }
    },
    {
      "stepOrder": 1,
      "internalStepOrder": 2,
      "actionType": "I",
      "configJson": {
        "input_sources": [
          "ALL_PROFILE_TABLE_2"
        ]
      }
    },
    {
      "stepOrder": 1,
      "actionType": "I",
      "saveAsVersion": 1,
      "versionName": "ALL_PROFILE_TABLE_2_version",
      "internalStepOrder": 3,
      "configJson": {
        "operation": "union",
        "input_sources": [
          {
            "source_name": "ALL_PROFILE_TABLE_2",
            "columns": [
              "COUNTRY"
            ]
          }
        ],
        "added_fields": [],
        "field_mappings": [],
        "merge_keys": [
          "COUNTRY"
        ],
        "priority_order": [
          "COUNTRY"
        ]
      }
    },
    {
      "stepOrder": 2,
      "internalStepOrder": 1,
      "actionType": "A",
      "configJson": {
        "input_sources": [
          {
            "source_name": "ALL_PROFILE_TABLE_1",
            "columns": [
              "COUNTRY",
              "PROFILE_ID",
              "CREATION_TS",
              "MODIFIED_TS",
              "EMAIL_DOMAIN",
              "EMAIL_ADDRESS_MD5",
              "GLOBALLY_SUPPRESSED_IND"
            ]
          }
        ],
        "match_keys": [
          "PROFILE_ID"
        ],
        "is_self_append": false,
        "append_sources": [
          {
            "source_type": "preconfigured",
            "source_name": "ALL_PROFILE_TABLE",
            "fields": [
              "PROFILE_ID"
            ],
            "priority": 1
          }
        ],
        "field_mappings": []
      }
    },
    {
      "stepOrder": 2,
      "internalStepOrder": 2,
      "actionType": "A",
      "configJson": {
        "input_sources": [
          {
            "source_name": "ALL_PROFILE_TABLE_1",
            "columns": [
              "COUNTRY",
              "PROFILE_ID",
              "CREATION_TS",
              "MODIFIED_TS",
              "EMAIL_DOMAIN",
              "EMAIL_ADDRESS_MD5",
              "GLOBALLY_SUPPRESSED_IND"
            ]
          }
        ],
        "field_mappings": [],
        "append_sources": [
          {
            "source_type": "preconfigured",
            "source_name": "ALL_PROFILE_TABLE",
            "priority": 1,
            "fields": [
              "PROFILE_ID"
            ]
          }
        ],
        "is_self_append": false,
        "match_keys": [
          "PROFILE_ID"
        ]
      },
      "saveAsVersion": 1,
      "versionName": "Append_ALL_PROFILE_TABLE_1_ALL_PROFILE_TABLE_v1"
    }
  ]
};
