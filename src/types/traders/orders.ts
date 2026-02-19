export interface order{
  id?: number|any;
  title?: any;
  content?: string |any;
  coverImg?: string |any;
  createdAt?: Date;
  view?: number;
  share?: number;
  category?: string |any;
  featured?: boolean;
  comments?: any[];
}