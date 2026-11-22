export const MAX_GALLERY_IMAGES = 8;
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const LIFE_STAGES = ["School", "College", "University", "Other"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export interface Inspiration {
  id: string;
  name: string;
  stage: LifeStage[];
  description: string;
  text: string;
  profilePicture: string | null;
  gallery: string[];
  createdAt: string;
}
