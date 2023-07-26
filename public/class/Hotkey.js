import { Tavern } from "./Tavern.js";

/**
 * @param     {Object}    txtarea       javascript Element Object to the textarea
 * @param     {String}    text          markdown enclosing tag text
 * @param     {String}    defaultTxt    Default Text to be inserted when no text is selected
 * @param     {String}    text2         markdown enclosing tag text for closing if different from opening
 */
export function insertFormating(txtarea, text, defaultTxt = "", text2 = "") {
	let selectStart = txtarea.selectionStart;
	let selectEnd = txtarea.selectionEnd;
	let scrollPos = txtarea.scrollTop;
	let caretPos = txtarea.selectionStart;
	let mode = 0;

	let front = txtarea.value.substring(0, caretPos);
	let back = txtarea.value.substring(selectEnd, txtarea.value.length);
	let middle = txtarea.value.substring(caretPos, selectEnd);

	// Sets ending tag as opening tag if empty
	if (text2 == "") {
		text2 = text;
	}
	let textLen = text.length;
	let text2Len = text2.length;

	if (selectStart === selectEnd) {
		middle = defaultTxt;
		mode = 1;
	} else {
		if (front.substr(-textLen) == text && back.substr(0, text2Len) == text2) {
			front = front.substring(0, front.length - textLen);
			back = back.substring(text2Len, back.length);
			text = "";
			text2 = "";
			mode = 2;
		} else if (middle.substr(0, textLen) == text && middle.substr(-text2Len) == text2) {
			middle = middle.substring(textLen, middle.length - text2Len);
			text = "";
			text2 = "";
			mode = 3;
		}
	}

	txtarea.value = front + text + middle + text2 + back;
	if (selectStart !== selectEnd) {
		if (mode === 0) {
			txtarea.selectionStart = selectStart + textLen;
			txtarea.selectionEnd = selectEnd + textLen;
		} else if (mode === 2) {
			txtarea.selectionStart = selectStart - textLen;
			txtarea.selectionEnd = selectEnd - textLen;
		} else if (mode === 3) {
			txtarea.selectionStart = selectStart;
			txtarea.selectionEnd = selectEnd - textLen - text2Len;
		}
	} else {
		txtarea.selectionStart = selectStart + textLen;
		txtarea.selectionEnd = txtarea.selectionStart + middle.length;
	}

	txtarea.focus();
	txtarea.scrollTop = scrollPos;
}

/**
 * @param {JQuery<HTMLTextAreaElement>} textarea
 * @returns
 */
function isTextSelected(textarea) {
	var selectedTextLength = textarea[0].selectionEnd - textarea[0].selectionStart;
	// you can also use vanilla javascript like below if you want to
	// var selectedTextLength = textarea.selectionEnd - textarea.selectionStart;
	return selectedTextLength > 0;
}

$(() => {
	$("#send_textarea").on("keydown", function (e) {
		const key = e.key;

		if (e.ctrlKey && ["b", "i", "q"].includes(key.toLowerCase())) {
			e.preventDefault();
			let focused = document.activeElement;

			if (key.toLowerCase() === "b") {
				insertFormating(focused, "**", "bold");
			} else if (key.toLowerCase() === "i") {
				insertFormating(focused, "*", "italic");
			}

			return;
		}

		if (e.shiftKey && key === '"' && isTextSelected($(this))) {
			e.preventDefault();

			let focused = document.activeElement;
			return insertFormating(focused, '"');
		}

		if (key === "`" && isTextSelected($(this))) {
			e.preventDefault();

			let focused = document.activeElement;
			return insertFormating(focused, "`");
		}
	});

	$(document).on("keydown", (e) => {
		const key = e.key;

		const isChatTextareaFocus = $(":focus").is("#send_textarea");
		const isChatTextareaEmpty = $("#send_textarea").val().length === 0;

		if (isChatTextareaFocus && isChatTextareaEmpty) {
			if (Tavern.mode === "chat") {
				const lastMessage = $("#chat").children(".mes").last();

				// Swipe left
				if (key === "ArrowLeft") {
					if (
						JSON.parse(lastMessage.attr("is_user")) === false &&
						lastMessage.children(".swipe_left").css("display") !== "none"
					) {
						lastMessage.children(".swipe_left").trigger("click");
					}

					return;
				}

				// Swipe right
				if (key === "ArrowRight") {
					if (
						JSON.parse(lastMessage.attr("is_user")) === false &&
						lastMessage.children(".swipe_right").css("display") !== "none"
					) {
						lastMessage.children(".swipe_right").trigger("click");
					}

					return;
				}
			}
		}

		// Chat is focus and empty and not generating any message.
		if (isChatTextareaFocus && isChatTextareaEmpty && !Tavern.is_send_press) {
			// Edit user last message
			if (e.ctrlKey && key === "ArrowUp") {
				e.preventDefault();

				const lastMessage = $("#chat").children('.mes[is_user="true"]').last();

				lastMessage.find(".mes_edit").trigger("click");
				lastMessage[0].scrollIntoView({ behavior: "smooth", block: "center" });

				return;
			}

			// Edit last message
			if (key === "ArrowUp") {
				e.preventDefault();

				const lastMessage = $("#chat").children(".mes").last();

				if (parseInt(lastMessage.attr("mesid")) > 0) {
					lastMessage.find(".mes_edit").trigger("click");
				}

				return;
			}

			// Regenerate ai last message
			if (e.ctrlKey && key === "Enter") {
				$("#option_regenerate").trigger("click");

				return;
			}

			// Show delete message button
			if (e.ctrlKey && key === "Delete") {
				$("#option_delete_mes").trigger("click");

				return;
			}
		}

		// Chat is focus and empty but message is being generate
		if (isChatTextareaFocus && isChatTextareaEmpty && Tavern.is_send_press) {
			const maxScrollHeight = $("#chat").prop("scrollHeight") - $("#chat").outerHeight();
			const currentScrollHeight = $("#chat").scrollTop();

			// Scroll down if last message is not visible
			if (key === "Escape" && currentScrollHeight < maxScrollHeight) {
				$("#chat")[0].scrollTo({ top: $("#chat")[0].scrollHeight, behavior: "smooth" });
				$("#send_textarea").trigger("focus");

				return;
			}

			// Cancel message
			if (key === "Escape" && $("#cancel_mes").css("display") !== "none") {
				$("#cancel_mes").trigger("click");

				return;
			}
		}

		// Chat is focus and not generaate, either empty or not
		if (isChatTextareaFocus && !Tavern.is_send_press) {
			// Tab
			if (key === "Tab") {
				e.preventDefault(); // Prevent the default action: the focus shift

				let textArea = $("#send_textarea");

				let start = textArea[0].selectionStart; // Get the current cursor position
				let end = textArea[0].selectionEnd; // Get the current end (If selected text exists)

				// Insert a "\t" at the current cursor position:
				// Get the existing value, add a "\t" at the right place, then put the rest of the text back
				textArea.val(
					textArea.val().substring(0, start) + "\t" + textArea.val().substring(end),
				);

				// Finally, set the cursor's position right after the newly-inserted "\t"
				textArea[0].selectionStart = textArea[0].selectionEnd = start + 1;

				return;
			}
		}

		// Chat is focus and not generating but not empty
		if (isChatTextareaFocus && !isChatTextareaEmpty && !Tavern.is_send_press) {
			// Send message
			if (e.ctrlKey && key === "Enter") {
				e.preventDefault();
				$("#send_button").trigger("click");

				return;
			}
		}

		const isEditChatFocus = $(":focus").is("textarea.edit_textarea");

		if (isEditChatFocus) {
			const edit_mes = $("textarea.edit_textarea").parent().parent().parent();

			// Cancel edit message
			if (key == "Escape") {
				e.preventDefault();

				if (edit_mes.children(".edit_block").css("display") !== "none") {
					edit_mes.children(".edit_block").children(".mes_edit_cancel").trigger("click");
				}

				// Focus back to send textarea
				$("#send_textarea").trigger("focus");

				return;
			}

			// Confirm edit message
			if (e.ctrlKey && key === "Enter") {
				e.preventDefault();

				if (edit_mes.children(".edit_block").css("display") !== "none") {
					edit_mes.children(".edit_block").children(".mes_edit_done").trigger("click");
				}

				// Focus back to send textarea
				$("#send_textarea").trigger("focus");

				return;
			}
		}

		if (key == "Escape") {
			if (
				$("#shadow_popup").css("display") == "block" &&
				$("#shadow_popup").css("opacity") == "1"
			) {
				$("#shadow_popup").transition({
					opacity: 0,
					duration: 250,
					easing: "",
					complete: function () {
						$("#shadow_popup").css({ display: "none" });
					},
				});

				return;
			}

			if ($("#chat").parent().css("display") !== "none") {
				$("#chat")[0].scrollTo({ top: $("#chat")[0].scrollHeight, behavior: "smooth" });

				$("#send_textarea").trigger("focus");

				return;
			}
		}
	});
});
