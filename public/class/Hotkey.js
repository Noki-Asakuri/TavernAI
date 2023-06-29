import { Tavern } from "./Tavern.js";

export function insertFormating(txtarea, text, defaultTxt = "", text2 = "") {
	let selectStart = txtarea.selectionStart;
	let selectEnd = txtarea.selectionEnd;
	let scrollPos = txtarea.scrollTop;
	let caretPos = txtarea.selectionStart;
	let mode = 0; //Adding markdown with selected text
	let front = txtarea.value.substring(0, caretPos);
	let back = txtarea.value.substring(selectEnd, txtarea.value.length);
	let middle = txtarea.value.substring(caretPos, selectEnd);

	if (text2 == "") {
		text2 = text;
	}
	let textLen = text.length;
	let text2Len = text2.length;

	if (selectStart === selectEnd) {
		middle = defaultTxt;
		mode = 1; //Adding markdown with default text
	} else {
		if (front.substr(-textLen) == text && back.substr(0, text2Len) == text2) {
			front = front.substring(0, front.length - textLen);
			back = back.substring(text2Len, back.length);
			text = "";
			text2 = "";
			mode = 2; //Removing markdown with selected text eg. **<selected>bold<selected>**
		} else if (middle.substr(0, textLen) == text && middle.substr(-text2Len) == text2) {
			middle = middle.substring(textLen, middle.length - text2Len);
			text = "";
			text2 = "";
			mode = 3; //Removing markdown with selected text eg. <selected>**bold**<selected>
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

$(() => {
	$("#send_textarea").on("keydown", function (e) {
		const key = e.key;

		if (e.ctrlKey && ["b", "i"].includes(key.toLowerCase())) {
			e.preventDefault();
			let focused = document.activeElement;

			if (key.toLowerCase() === "b") {
				insertFormating(focused, "**", "bold");
			} else if (key.toLowerCase() == "i") {
				insertFormating(focused, "*", "italic");
			}
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

				lastMessage.children(".mes_edit").trigger("click");
				// lastMessage[0].scrollIntoView({ behavior: "smooth", block: "center" });

				$("#chat")[0].scrollTo({ top: lastMessage[0].scrollHeight, behavior: "smooth" });

				return;
			}

			// Edit last message
			if (key === "ArrowUp") {
				e.preventDefault();

				const lastMessage = $("#chat").children(".mes").last();

				if (parseInt(lastMessage.attr("mesid")) > 0) {
					lastMessage.children(".mes_edit").trigger("click");
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

		// Chat is focus and not generating but not empty
		if (isChatTextareaFocus && !Tavern.is_send_press) {
			// Send message
			if (!e.shiftKey && key === "Enter") {
				$("#send_button").trigger("click");

				return;
			}
		}

		const isEditChatFocus = $(":focus").is("textarea.edit_textarea");

		if (isEditChatFocus) {
			const edit_mes = $("textarea.edit_textarea").parent().parent().parent();

			// Cancel edit message
			if (key == "Escape") {
				if (edit_mes.children(".edit_block").css("display") !== "none") {
					edit_mes.children(".edit_block").children(".mes_edit_cancel").trigger("click");
				}

				return;
			}

			// Confirm edit message
			if (!e.shiftKey && key === "Enter") {
				if (edit_mes.children(".edit_block").css("display") !== "none") {
					edit_mes.children(".edit_block").children(".mes_edit_done").trigger("click");
				}

				return;
			}
		}

		if (key == "Escape") {
			if (
				$("#shadow_popup").css("display") == "block" &&
				$("#shadow_popup").css("opacity") == "1"
			) {
				$("#shadow_popup").css({ display: "none", opacity: "0" });

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
