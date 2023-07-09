import { textareaAutosize } from "../script.js";
import { Resizable } from "./Resizable.mjs";
import { UIFactory } from "./UIFactory.mjs";

export class UIMasterSettings extends Resizable {
	resize_on_first_launch = true;

	/**
	 * Creates modular, resizable window in given container. Root is a "shadow" (taking up the whole screen), its sole div .container child is the window itself.
	 * @param {{ root: Element }} options
	 */
	constructor(options) {
		const { top, left, right, bottom } =
			$(document).width() <= 450
				? { top: 0, left: 0, right: 1, bottom: 1 }
				: { top: 0.1, left: 0.15, right: 0.7, bottom: 0.9 };

		super({
			root: options.root,
			uid: "masterSetting",
			top,
			left,
			right,
			bottom,
		});
	}

	ResizeAllTextArea() {
		if (!this.resize_on_first_launch) return;

		const all_textarea = [
			$("#system_prompt_textarea"),
			$("#jailbreak_prompt_textarea"),
			$("#user_jailbreak_prompt_textarea"),
			$("#nsfw_encouraged_prompt_textarea"),
			$("#nsfw_avoidance_prompt_textarea"),
			$("#impersonate_prompt_textarea"),
		];

		all_textarea.map((el) => textareaAutosize(el));

		this.resize_on_first_launch = false;
	}
}
