import { Resizable } from "./Resizable.mjs";
import { UIFactory } from "./UIFactory.mjs";

export class UIMasterSettings extends Resizable {
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
}
