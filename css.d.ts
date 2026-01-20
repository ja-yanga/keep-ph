// Type declarations for CSS imports
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.layer.css" {
  const content: { [className: string]: string };
  export default content;
}
