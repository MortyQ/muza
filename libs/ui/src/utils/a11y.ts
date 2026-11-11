/**
 * Enter/Space activation for an element that acts as a button or checkbox without being one.
 *
 * Dispatches a native click on the element, so its existing `@click` handler runs with a real
 * `MouseEvent` and whatever guards it already has (disabled, loading, stopPropagation) apply
 * unchanged. Space is prevented so it does not scroll the page.
 */
export const clickOnActivationKey = (event: KeyboardEvent): void => {
  if (event.key !== "Enter" && event.key !== " ") return;
  // Keys pressed inside a nested control (an input, a real button) belong to that control.
  if (event.target !== event.currentTarget) return;
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.click();
};
