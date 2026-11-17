export type StoryboardScene = {
  title: string;
  text: string;
  speech?: string;
  duration: number; // in seconds (2 - 15)
  imageAssetId?: string;
  imageLicense?: string;
};

export type StoryboardCaptionCue = {
  startMs: number;
  endMs: number;
  text: string;
};

export type GeneratedStoryboard = {
  title: string;
  platform: "tiktok" | "reels" | "shorts" | "youtube" | "square";
  template: "editorial" | "product" | "launch";
  narration: "none" | "fr" | "en";
  scenes: StoryboardScene[];
  captionCues: StoryboardCaptionCue[];
  totalDuration: number;
  explanation: {
    hookRationale: string;
    targetPersonaName?: string;
    addressedObjection?: string;
    highlightedProduct?: string;
  };
};

export type GenerateStoryboardInput = {
  proposalId?: string;
  calendarItemId?: string;
  campaignId?: string;
  platform?: "tiktok" | "reels" | "shorts" | "youtube" | "square";
  template?: "editorial" | "product" | "launch";
  narration?: "none" | "fr" | "en";
  customInstructions?: string;
};
