/**
 * @param {Element} element
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
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
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
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

/**
 * @param {Function} func
 * @param {number} [timeout=300]
 *
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
 */
export function debounce(func, timeout = 300) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			func.apply(this, args);
		}, timeout);
	};
}

/**
 * @param {string} character
 * @param {string} string
 *
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
 */
export function countOccurrences(string, character) {
	let count = 0;

	for (let i = 0; i < string.length; i++) {
		if (string[i] === character) {
			count++;
		}
	}

	return count;
}

/**
 * @param {number} number
 *
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
 */
export function isOdd(number) {
	return number % 2 !== 0;
}

/**
 * @param {Element} messageElement
 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern/blob/2befcd87124f30e09496a02e7ce203c3d9ba15fd/public/script.js#L1231>
 */
export function addHeaderAndCopyToCodeBlock(messageElement) {
	const codeBlocks = $(messageElement).find("pre code");

	for (let i = 0; i < codeBlocks.length; i++) {
		let codeBlockElement = $(codeBlocks.get(i));

		if (codeBlockElement.parent().find(".code-header").length > 0) continue;
		if (navigator.clipboard === undefined) return;

		let copyButton = $(
			`
			<button class="code-copy">
				<i class="fa-solid fa-copy"></i> 
				<span> Copy </span>
			</button>
			`,
		);

		copyButton.on("click", function () {
			// If the button is disabled, stop here
			if ($(this).is(":disabled")) return;

			navigator.clipboard.writeText(codeBlocks.get(i).innerText);
			let icon = $(this).find("i");

			// Fade out the icon, then change the class and fade it back in
			icon.fadeOut(200, function () {
				icon.removeClass("fa-copy").addClass("fa-check");
				icon.fadeIn(200);
			});

			// Disable the button
			$(this).prop("disabled", true);

			// After 1 second, enable the button and change the icon back to 'copy'
			setTimeout(
				function () {
					icon.fadeOut(
						200,
						function () {
							icon.removeClass("fa-check").addClass("fa-copy");
							icon.fadeIn(200);
							$(this).prop("disabled", false);
						}.bind(this),
					);
				}.bind(this),
				1000,
			); // bind 'this' to the setTimeout callback scope
		});

		let languageMatch = codeBlockElement?.attr("class")?.match(/language-(\w+)/);
		let language = languageMatch && languageMatch[1] ? languageMatch[1] : "plaintext";

		// Create a header to display the language
		let header = $("<div/>", {
			class: "code-header",
			text: language.charAt(0).toUpperCase() + language.slice(1),
		});

		// Insert the header and copy button to the code block's parent (presumably a <pre> element)
		codeBlockElement.parent().prepend(copyButton).prepend(header);
	}
}
