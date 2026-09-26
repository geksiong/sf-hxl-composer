export type HXLComponentType =
  | 'tile/widget'
  | 'tile/card'
  | 'tile/column'
  | 'tile/row'
  | 'tile/container'
  | 'tile/text'
  | 'tile/markdown'
  | 'tile/button'
  | 'tile/badge'
  | 'tile/callout'
  | 'tile/avatar'
  | 'tile/image'
  | 'tile/link'
  | 'tile/table'
  | 'tile/list'
  | 'tile/listItem'
  | 'tile/accordion'
  | 'tile/accordionItem'
  | 'tile/progress'
  | 'tile/spinner'
  | 'tile/separator'
  | 'tile/spacer'
  | 'tile/code'
  | 'tile/icon';

export interface HXLNodeMeta {
  if?: string;
  forEach?: string;
  forItem?: string;
  forIndex?: string;
}

export interface HXLNode {
  id: string;
  type: HXLComponentType;
  definition?: string;
  properties: Record<string, any>;
  attributes?: Record<string, any>;
  meta?: HXLNodeMeta;
  children?: HXLNode[];
}

export type SurfaceType = 'lightning' | 'slack' | 'chat' | 'fluid' | 'raw';

export type ViewMode = 'canvas' | 'split' | 'json';

export interface HXLSchemaAttribute {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  default?: any;
  lightningType?: string;
  'lightning:type'?: string;
}

export interface HXLSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type?: 'object';
  properties: {
    attributes: {
      type?: 'object';
      'lightning:type'?: string;
      properties: Record<string, HXLSchemaAttribute>;
      required?: string[];
    };
  };
}

export interface HXLWidgetBundle {
  name: string;
  masterLabel: string;
  description: string;
  widgetType: string;
  root: HXLNode;
  schema: HXLSchema;
  mockData: Record<string, any>;
}

export interface ComponentPropSpec {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'expression' | 'json';
  description: string;
  default?: any;
  options?: Array<{ label: string; value: string }>;
  lightningType?: string;
}

export interface HXLComponentDoc {
  type: HXLComponentType;
  displayName: string;
  category: 'Layout' | 'Typography' | 'Actions & Navigation' | 'Media & Data' | 'Feedback & Utility';
  icon: string;
  description: string;
  canHaveChildren: boolean;
  allowedChildren?: HXLComponentType[];
  officialProps: ComponentPropSpec[];
  defaultProperties: Record<string, any>;
  defaultChildren?: () => HXLNode[];
  exampleJson: object;
  usageNotes: string;
}
