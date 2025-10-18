type FlexDirection = "row" | "col";
type Justify =
  | "start"
  | "end"
  | "center"
  | "between"
  | "around"
  | "evenly"
  | "normal"
  | "stretch";
type Align = "start" | "end" | "center" | "baseline" | "stretch";

const flex = (
  direction: FlexDirection = "row",
  justify: Justify = "start",
  align: Align = "center"
) => `flex flex-${direction} justify-${justify} items-${align}`;

export default flex;
