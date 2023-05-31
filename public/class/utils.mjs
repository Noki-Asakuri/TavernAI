/**
 * @param {Element} element
 * @author Cohee1207 <https://github.com/SillyTavern/SillyTavern>
 */
export function saveCaretPosition(element) {
	// Get the current selection
	const selection = window.getSelection();

	// If the selection is empty, return null
	if (selection.rangeCount === 0) {
		return null;
	}

	// Get the range of the current selection
	const range = selection.getRangeAt(0);

	// If the range is not within the specified element, return null
	if (!element.contains(range.commonAncestorContainer)) {
		return null;
	}

	// Return an object with the start and end offsets of the range
	const position = {
		start: range.startOffset,
		end: range.endOffset,
	};

	console.log("Caret saved", position);

	return position;
}

/**
 * @param {Element} element
 * @param {number} position
 *
 * @author Cohee1207 <https://github.com/SillyTavern/SillyTavern>
 * @description Restore the caret position in a contenteditable element
 */
export function restoreCaretPosition(element, position) {
	// If the position is null, do nothing
	if (!position) {
		return;
	}

	console.log("Caret restored", position);

	// Create a new range object
	const range = new Range();

	// Set the start and end positions of the range within the element
	range.setStart(element.childNodes[0], position.start);
	range.setEnd(element.childNodes[0], position.end);

	// Create a new selection object and set the range
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
}
