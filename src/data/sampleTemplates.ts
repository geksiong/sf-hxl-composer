import { HXLWidgetBundle } from '../types/hxl';

export const SAMPLE_TEMPLATES: HXLWidgetBundle[] = [
  // 1. Official Salesforce HXL Hotel Card Widget
  // Matching: https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-composition.html
  // and https://developer.salesforce.com/docs/platform/hxl/guide/hxl-widget-schema.html
  {
    name: 'hotelCard',
    masterLabel: 'Hotel Card',
    description: 'Displays hotel information as a visual card.',
    widgetType: 'JSON',
    root: {
      id: 'root_widget',
      type: 'tile/widget',
      definition: 'tile/widget',
      properties: {},
      children: [
        {
          id: 'card_hotel',
          type: 'tile/card',
          definition: 'tile/card',
          properties: {
            padding: 'lg',
            variant: 'default',
            maxWidth: 'full',
          },
          children: [
            {
              id: 'img_hotel',
              type: 'tile/image',
              definition: 'tile/image',
              properties: {
                src: '{!$attrs.imageUrl}',
                alt: '{!$attrs.title}',
                aspectRatio: '16:9',
                rounded: true,
              },
            },
            {
              id: 'txt_hotel_title',
              type: 'tile/text',
              definition: 'tile/text',
              properties: {
                text: '{!$attrs.title}',
                variant: 'h3',
                weight: 'semibold',
              },
            },
            {
              id: 'txt_hotel_price',
              type: 'tile/text',
              definition: 'tile/text',
              properties: {
                text: '{!$attrs.price}',
                variant: 'body',
                weight: 'medium',
              },
            },
            {
              id: 'txt_hotel_desc',
              type: 'tile/text',
              definition: 'tile/text',
              properties: {
                text: '{!$attrs.description}',
                variant: 'body',
              },
            },
          ],
        },
      ],
    },
    schema: {
      title: 'Hotel Card Widget',
      description: 'Displays hotel information as a visual card',
      type: 'object',
      properties: {
        attributes: {
          'lightning:type': 'lightning__objectType',
          properties: {
            title: {
              title: 'Hotel Name',
              description: 'Primary heading displayed at the top',
              'lightning:type': 'lightning__textType',
              lightningType: 'lightning__textType',
              default: 'Grand Alpine Resort & Spa',
            },
            imageUrl: {
              title: 'Image URL',
              description: 'URL of the hotel image',
              'lightning:type': 'lightning__urlType',
              lightningType: 'lightning__urlType',
              default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
            },
            price: {
              title: 'Price Per Night',
              description: 'Nightly rate displayed as currency',
              'lightning:type': 'lightning__numberType',
              lightningType: 'lightning__numberType',
              default: '$280 / night',
            },
            description: {
              title: 'Description',
              description: 'Short description of the hotel',
              'lightning:type': 'lightning__textType',
              lightningType: 'lightning__textType',
              default: 'Nestled in the pristine mountain valley featuring thermal springs, panoramic mountain vistas, and luxury chalets.',
            },
          },
          required: ['title', 'imageUrl', 'price'],
        },
      },
    },
    mockData: {
      title: 'Grand Alpine Resort & Spa',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
      price: '$280 / night',
      description: 'Nestled in the pristine mountain valley featuring thermal springs, panoramic mountain vistas, and luxury chalets.',
    },
  },

  // 2. Agentforce Case Resolution Card
  {
    name: 'caseResolutionWidget',
    masterLabel: 'Case Resolution & Agentforce Summary',
    description: 'Autonomous case diagnosis and customer resolution tile powered by Agentforce.',
    widgetType: 'JSON',
    root: {
      id: 'root_widget',
      type: 'tile/widget',
      definition: 'tile/widget',
      properties: {},
      children: [
        {
          id: 'card_case',
          type: 'tile/card',
          definition: 'tile/card',
          properties: {
            variant: 'default',
            padding: 'lg',
            maxWidth: 'full',
          },
          children: [
            {
              id: 'row_header',
              type: 'tile/row',
              definition: 'tile/row',
              properties: {
                gap: 'small',
                align: 'center',
                justify: 'space-between',
                wrap: false,
              },
              children: [
                {
                  id: 'col_title_group',
                  type: 'tile/column',
                  definition: 'tile/column',
                  properties: { gap: 'none', align: 'start' },
                  children: [
                    {
                      id: 'text_case_num',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: {
                        text: 'Case #{!$attrs.caseNumber}',
                        variant: 'caption',
                        weight: 'bold',
                        color: 'muted',
                      },
                    },
                    {
                      id: 'text_case_subject',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: {
                        text: '{!$attrs.subject}',
                        variant: 'h3',
                        weight: 'bold',
                        color: 'default',
                      },
                    },
                  ],
                },
                {
                  id: 'badge_status',
                  type: 'tile/badge',
                  definition: 'tile/badge',
                  properties: {
                    label: '{!$attrs.status}',
                    variant: 'warning',
                  },
                },
              ],
            },
            {
              id: 'sep_1',
              type: 'tile/separator',
              definition: 'tile/separator',
              properties: { orientation: 'horizontal', margin: 'small' },
            },
            {
              id: 'row_customer',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'medium', align: 'center', justify: 'start' },
              children: [
                {
                  id: 'avatar_cust',
                  type: 'tile/avatar',
                  definition: 'tile/avatar',
                  properties: {
                    name: '{!$attrs.customerName}',
                    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                    size: 'medium',
                    shape: 'circle',
                  },
                },
                {
                  id: 'col_cust_info',
                  type: 'tile/column',
                  definition: 'tile/column',
                  properties: { gap: 'none', align: 'start' },
                  children: [
                    {
                      id: 'text_cust_name',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: {
                        text: '{!$attrs.customerName}',
                        variant: 'body',
                        weight: 'semibold',
                      },
                    },
                    {
                      id: 'text_account_tier',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: {
                        text: '{!$attrs.accountTier} Account',
                        variant: 'caption',
                        color: 'muted',
                      },
                    },
                  ],
                },
                {
                  id: 'spacer_cust',
                  type: 'tile/spacer',
                  definition: 'tile/spacer',
                  properties: { size: 'flex' },
                },
                {
                  id: 'badge_priority',
                  type: 'tile/badge',
                  definition: 'tile/badge',
                  properties: {
                    label: '{!$attrs.priority} Priority',
                    variant: 'error',
                  },
                },
              ],
            },
            {
              id: 'callout_ai',
              type: 'tile/callout',
              definition: 'tile/callout',
              properties: {
                variant: 'tip',
                title: 'Agentforce Diagnosis',
                description: '{!$attrs.aiInsight}',
              },
            },
            {
              id: 'progress_sla',
              type: 'tile/progress',
              definition: 'tile/progress',
              properties: {
                value: '{!$attrs.slaPercent}',
                label: 'First Contact SLA Remaining',
                variant: 'brand',
                showValueText: true,
              },
            },
            {
              id: 'row_actions',
              type: 'tile/row',
              definition: 'tile/row',
              properties: {
                gap: 'small',
                align: 'center',
                justify: 'end',
              },
              children: [
                {
                  id: 'btn_escalate',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: {
                    label: 'Escalate to Tier 2',
                    variant: 'neutral',
                    action: 'escalate_case',
                    icon: 'none',
                  },
                },
                {
                  id: 'btn_resolve',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: {
                    label: 'Execute Suggested Resolution',
                    variant: 'brand',
                    action: 'resolve_case',
                    icon: 'check',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    schema: {
      title: 'Case Resolution & Agentforce Summary',
      description: 'Autonomous case diagnosis and customer resolution tile powered by Agentforce.',
      type: 'object',
      properties: {
        attributes: {
          'lightning:type': 'lightning__objectType',
          properties: {
            caseNumber: {
              type: 'string',
              title: 'Case Number',
              description: 'Unique 8-digit support case identifier',
              'lightning:type': 'lightning__textType',
              default: '00492810',
            },
            subject: {
              type: 'string',
              title: 'Case Subject',
              description: 'Customer inquiry summary headline',
              'lightning:type': 'lightning__textType',
              default: 'API Rate Limit Exceeded on Payment Gateway',
            },
            status: {
              type: 'string',
              title: 'Case Status',
              description: 'Lifecycle state of the case record',
              'lightning:type': 'lightning__textType',
              default: 'Under AI Review',
            },
            customerName: {
              type: 'string',
              title: 'Customer Name',
              description: 'Primary contact person',
              'lightning:type': 'lightning__textType',
              default: 'Elena Rostova',
            },
            accountTier: {
              type: 'string',
              title: 'Account Tier',
              description: 'SLA support tier tiering',
              'lightning:type': 'lightning__textType',
              default: 'Enterprise Premier',
            },
            priority: {
              type: 'string',
              title: 'Case Priority',
              description: 'Severity flag: Low, Medium, High, Critical',
              'lightning:type': 'lightning__textType',
              default: 'High',
            },
            aiInsight: {
              type: 'string',
              title: 'Agentforce Diagnosis',
              description: 'Root cause and resolution recommendation generated by Agentforce',
              'lightning:type': 'lightning__textType',
              default: 'Root cause identified: Burst traffic during promotion exceeded 10,000 req/min. Agentforce recommends granting a temporary burst quota increase of +5,000 req/min for 48 hours.',
            },
            slaPercent: {
              type: 'number',
              title: 'SLA Remaining Percentage',
              description: 'Percentage of resolution SLA window left (0 to 100)',
              'lightning:type': 'lightning__numberType',
              default: 78,
            },
          },
          required: ['caseNumber', 'subject', 'status'],
        },
      },
    },
    mockData: {
      caseNumber: '00492810',
      subject: 'API Rate Limit Exceeded on Payment Gateway',
      status: 'Under AI Review',
      customerName: 'Elena Rostova',
      accountTier: 'Enterprise Premier',
      priority: 'High',
      aiInsight: 'Root cause identified: Burst traffic during promotion exceeded 10,000 req/min. Agentforce recommends granting a temporary burst quota increase of +5,000 req/min for 48 hours.',
      slaPercent: 78,
    },
  },

  // 3. E-Commerce Order & Shipment Tracker
  {
    name: 'orderShipmentTracker',
    masterLabel: 'Order & Delivery Tracker',
    description: 'Customer shipment progress, carrier tracking, and line-item overview.',
    widgetType: 'JSON',
    root: {
      id: 'root_widget',
      type: 'tile/widget',
      definition: 'tile/widget',
      properties: {},
      children: [
        {
          id: 'card_order',
          type: 'tile/card',
          definition: 'tile/card',
          properties: { variant: 'default', padding: 'lg', maxWidth: 'full' },
          children: [
            {
              id: 'row_order_head',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'small', align: 'center', justify: 'space-between' },
              children: [
                {
                  id: 'col_order_num',
                  type: 'tile/column',
                  definition: 'tile/column',
                  properties: { gap: 'none', align: 'start' },
                  children: [
                    {
                      id: 'text_order_title',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: { text: 'Order #{!$attrs.orderNumber}', variant: 'h3', weight: 'bold' },
                    },
                    {
                      id: 'text_est_delivery',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: { text: 'Estimated Delivery: {!$attrs.estimatedDate}', variant: 'caption', color: 'muted' },
                    },
                  ],
                },
                {
                  id: 'badge_ship_status',
                  type: 'tile/badge',
                  definition: 'tile/badge',
                  properties: { label: '{!$attrs.shippingStatus}', variant: 'success' },
                },
              ],
            },
            {
              id: 'prog_delivery',
              type: 'tile/progress',
              definition: 'tile/progress',
              properties: {
                value: '{!$attrs.transitProgress}',
                label: 'Shipment Milestone: Out for Delivery',
                variant: 'success',
                showValueText: true,
              },
            },
            {
              id: 'table_items',
              type: 'tile/table',
              definition: 'tile/table',
              properties: {
                columns: [
                  { key: 'item', label: 'Item' },
                  { key: 'qty', label: 'Qty' },
                  { key: 'price', label: 'Price' },
                ],
                rows: [
                  { item: 'Salesforce Pro Wireless Barcode Scanner', qty: '2', price: '$540.00' },
                  { item: 'Thermal Label Rolls (Pack of 10)', qty: '4', price: '$80.00' },
                ],
                striped: true,
              },
            },
            {
              id: 'row_track_actions',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'medium', align: 'center', justify: 'space-between' },
              children: [
                {
                  id: 'link_tracking',
                  type: 'tile/link',
                  definition: 'tile/link',
                  properties: {
                    label: 'Carrier Tracking #{!$attrs.carrierTracking}',
                    url: 'https://fedex.com/tracking',
                    isExternal: true,
                  },
                },
                {
                  id: 'btn_support',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: {
                    label: 'Need Help?',
                    variant: 'neutral',
                    action: 'open_support_chat',
                    icon: 'sparkles',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    schema: {
      title: 'Order & Delivery Tracker',
      description: 'Customer shipment progress, carrier tracking, and line-item overview.',
      type: 'object',
      properties: {
        attributes: {
          'lightning:type': 'lightning__objectType',
          properties: {
            orderNumber: { type: 'string', title: 'Order Number', 'lightning:type': 'lightning__textType', default: 'SF-89210' },
            estimatedDate: { type: 'string', title: 'Estimated Delivery', 'lightning:type': 'lightning__dateTimeType', default: 'Tomorrow by 3:00 PM' },
            shippingStatus: { type: 'string', title: 'Shipping Status', 'lightning:type': 'lightning__textType', default: 'On Route' },
            transitProgress: { type: 'number', title: 'Transit Progress %', 'lightning:type': 'lightning__numberType', default: 85 },
            carrierTracking: { type: 'string', title: 'Carrier Tracking ID', 'lightning:type': 'lightning__textType', default: 'TRK-9831-FX' },
          },
          required: ['orderNumber', 'shippingStatus'],
        },
      },
    },
    mockData: {
      orderNumber: 'SF-89210',
      estimatedDate: 'Tomorrow by 3:00 PM',
      shippingStatus: 'On Route',
      transitProgress: 85,
      carrierTracking: 'TRK-9831-FX',
    },
  },

  // 4. Lead Quick Enrichment & Scoring Brief
  {
    name: 'leadEnrichmentTile',
    masterLabel: 'Lead Score & AI Buying Intent',
    description: 'Enriched customer profile and intent analysis for Sales Cloud and Agentforce.',
    widgetType: 'JSON',
    root: {
      id: 'root_widget',
      type: 'tile/widget',
      definition: 'tile/widget',
      properties: {},
      children: [
        {
          id: 'card_lead',
          type: 'tile/card',
          definition: 'tile/card',
          properties: { variant: 'default', padding: 'lg', maxWidth: 'full' },
          children: [
            {
              id: 'row_lead_header',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'medium', align: 'center', justify: 'space-between' },
              children: [
                {
                  id: 'avatar_lead',
                  type: 'tile/avatar',
                  definition: 'tile/avatar',
                  properties: {
                    name: '{!$attrs.leadName}',
                    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
                    size: 'medium',
                    shape: 'square',
                  },
                },
                {
                  id: 'col_lead_names',
                  type: 'tile/column',
                  definition: 'tile/column',
                  properties: { gap: 'none', align: 'start' },
                  children: [
                    {
                      id: 'text_lead_name',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: { text: '{!$attrs.leadName}', variant: 'h3', weight: 'bold' },
                    },
                    {
                      id: 'text_lead_role',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: { text: '{!$attrs.title} at {!$attrs.company}', variant: 'caption', color: 'muted' },
                    },
                  ],
                },
                {
                  id: 'spacer_lead',
                  type: 'tile/spacer',
                  definition: 'tile/spacer',
                  properties: { size: 'flex' },
                },
                {
                  id: 'badge_lead_stage',
                  type: 'tile/badge',
                  definition: 'tile/badge',
                  properties: { label: '{!$attrs.stage}', variant: 'brand' },
                },
              ],
            },
            {
              id: 'progress_lead_score',
              type: 'tile/progress',
              definition: 'tile/progress',
              properties: {
                value: '{!$attrs.score}',
                label: 'Einstein Lead Score: {!$attrs.score}/100 (High Propensity)',
                variant: 'brand',
                showValueText: true,
              },
            },
            {
              id: 'callout_intent',
              type: 'tile/callout',
              definition: 'tile/callout',
              properties: {
                variant: 'tip',
                title: 'Buying Signals Detected',
                description: '{!$attrs.intentSummary}',
              },
            },
            {
              id: 'accordion_lead',
              type: 'tile/accordion',
              definition: 'tile/accordion',
              properties: { allowMultiple: true },
              children: [
                {
                  id: 'acc_item_1',
                  type: 'tile/accordionItem',
                  definition: 'tile/accordionItem',
                  properties: { title: 'Verified Tech Stack & Budget', isOpen: true },
                  children: [
                    {
                      id: 'txt_tech',
                      type: 'tile/text',
                      definition: 'tile/text',
                      properties: {
                        text: 'Current CRM: Legacy On-Premise. Budget approved: $150,000+ for Q4 migration.',
                        variant: 'body-small',
                        color: 'muted',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'row_lead_btn',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'small', align: 'center', justify: 'end' },
              children: [
                {
                  id: 'btn_schedule',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: { label: 'Book Discovery Call', variant: 'neutral', action: 'book_call' },
                },
                {
                  id: 'btn_convert',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: { label: 'Convert to Opportunity', variant: 'brand', action: 'convert_opp', icon: 'sparkles' },
                },
              ],
            },
          ],
        },
      ],
    },
    schema: {
      title: 'Lead Score & AI Buying Intent',
      description: 'Enriched customer profile and intent analysis for Sales Cloud and Agentforce.',
      type: 'object',
      properties: {
        attributes: {
          'lightning:type': 'lightning__objectType',
          properties: {
            leadName: { type: 'string', title: 'Lead Name', 'lightning:type': 'lightning__textType', default: 'Marcus Vance' },
            title: { type: 'string', title: 'Job Title', 'lightning:type': 'lightning__textType', default: 'VP of Customer Experience' },
            company: { type: 'string', title: 'Company', 'lightning:type': 'lightning__textType', default: 'Apex Logistics Global' },
            stage: { type: 'string', title: 'Sales Stage', 'lightning:type': 'lightning__textType', default: 'Marketing Qualified' },
            score: { type: 'number', title: 'Lead Score', 'lightning:type': 'lightning__numberType', default: 92 },
            intentSummary: {
              type: 'string',
              title: 'AI Intent Summary',
              'lightning:type': 'lightning__textType',
              default: 'Marcus downloaded 3 whitepapers on Agentforce and visited pricing page twice today. Key pain point: agent burnout during peak shipping seasons.',
            },
          },
          required: ['leadName', 'company', 'score'],
        },
      },
    },
    mockData: {
      leadName: 'Marcus Vance',
      title: 'VP of Customer Experience',
      company: 'Apex Logistics Global',
      stage: 'Marketing Qualified',
      score: 92,
      intentSummary: 'Marcus downloaded 3 whitepapers on Agentforce and visited pricing page twice today. Key pain point: agent burnout during peak shipping seasons.',
    },
  },

  // 5. System Health & Incident Alert
  {
    name: 'systemIncidentAlert',
    masterLabel: 'System Incident & Escalation Alert',
    description: 'DevOps and IT Service Cloud escalation callout with error stack and remediation.',
    widgetType: 'JSON',
    root: {
      id: 'root_widget',
      type: 'tile/widget',
      definition: 'tile/widget',
      properties: {},
      children: [
        {
          id: 'card_incident',
          type: 'tile/card',
          definition: 'tile/card',
          properties: { variant: 'default', padding: 'lg', maxWidth: 'full' },
          children: [
            {
              id: 'callout_alert',
              type: 'tile/callout',
              definition: 'tile/callout',
              properties: {
                variant: 'error',
                title: 'Critical Incident: {!$attrs.serviceName}',
                description: '{!$attrs.incidentDescription}',
              },
            },
            {
              id: 'code_stack',
              type: 'tile/code',
              definition: 'tile/code',
              properties: {
                code: '{!$attrs.errorCode}',
                language: 'bash',
              },
            },
            {
              id: 'row_incident_meta',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'small', align: 'center', justify: 'space-between' },
              children: [
                {
                  id: 'text_impacted',
                  type: 'tile/text',
                  definition: 'tile/text',
                  properties: {
                    text: 'Impacted Users: {!$attrs.affectedUsers}',
                    variant: 'body-small',
                    weight: 'semibold',
                    color: 'destructive',
                  },
                },
                {
                  id: 'badge_incident_sev',
                  type: 'tile/badge',
                  definition: 'tile/badge',
                  properties: { label: 'P1 - Active', variant: 'error' },
                },
              ],
            },
            {
              id: 'row_alert_actions',
              type: 'tile/row',
              definition: 'tile/row',
              properties: { gap: 'small', align: 'center', justify: 'end' },
              children: [
                {
                  id: 'btn_ack',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: { label: 'Acknowledge', variant: 'neutral', action: 'ack_alert' },
                },
                {
                  id: 'btn_rollback',
                  type: 'tile/button',
                  definition: 'tile/button',
                  properties: { label: 'Trigger Auto-Rollback', variant: 'destructive', action: 'rollback', icon: 'sparkles' },
                },
              ],
            },
          ],
        },
      ],
    },
    schema: {
      title: 'System Incident & Escalation Alert',
      description: 'DevOps and IT Service Cloud escalation callout with error stack and remediation.',
      type: 'object',
      properties: {
        attributes: {
          'lightning:type': 'lightning__objectType',
          properties: {
            serviceName: { type: 'string', title: 'Service Name', 'lightning:type': 'lightning__textType', default: 'Checkout Orchestrator v2.4' },
            incidentDescription: {
              type: 'string',
              title: 'Incident Description',
              'lightning:type': 'lightning__textType',
              default: 'Circuit breaker tripped due to 503 upstream responses from Stripe token vault. Latency spike: 4,200ms.',
            },
            errorCode: {
              type: 'string',
              title: 'Error Log / Trace',
              'lightning:type': 'lightning__textType',
              default: '[FATAL] 2026-09-15T17:12:09Z [auth-service] ConnectionPoolTimeoutException: Timeout waiting for idle connection from pool.',
            },
            affectedUsers: { type: 'string', title: 'Affected Users', 'lightning:type': 'lightning__textType', default: '~1,420 sessions' },
          },
          required: ['serviceName', 'incidentDescription'],
        },
      },
    },
    mockData: {
      serviceName: 'Checkout Orchestrator v2.4',
      incidentDescription: 'Circuit breaker tripped due to 503 upstream responses from Stripe token vault. Latency spike: 4,200ms.',
      errorCode: '[FATAL] 2026-09-15T17:12:09Z [auth-service] ConnectionPoolTimeoutException: Timeout waiting for idle connection from pool.',
      affectedUsers: '~1,420 sessions',
    },
  },
];
