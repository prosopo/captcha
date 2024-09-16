export const getParentForm = (element: Element): HTMLFormElement | null =>
	element.closest("form") as HTMLFormElement;
