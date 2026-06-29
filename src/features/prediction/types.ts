export interface UploadedFile {
  name: string;
  size: number;
  type: "sales" | "inventory";
  rows?: number;
  uploading?: boolean;
  uploadError?: string;
  datasetId?: string;
  rawFile?: File;
}
