import { encode } from "../scripts/gpt-2-3-tokenizer/mod.js";
import { Resizable } from "./Resizable.mjs";
import { UIFactory } from "./UIFactory.mjs";

export class UIMasterSettings extends Resizable {
	/**
	 * Creates modular, resizable window in given container. Root is a "shadow" (taking up the whole screen), its sole div .container child is the window itself.
	 * @param {{ root: Element }} options
	 */
	constructor(options) {
		super({
			root: options.root,
			uid: "masterSetting",
			top: 0.3,
			left: 0.3,
			right: 0.7,
			bottom: 0.7,
		});
	}
}
