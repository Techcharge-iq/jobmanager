export type Tone = "lavender" | "mint" | "peach" | "sky" | "rose";

export const toneSurface: Record<Tone, string> = {
  lavender: "bg-lavender text-lavender-foreground",
  mint: "bg-mint text-mint-foreground",
  peach: "bg-peach text-peach-foreground",
  sky: "bg-sky text-sky-foreground",
  rose: "bg-rose text-rose-foreground",
};
