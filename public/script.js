const { encode, decode } = GPTTokenizer_cl100k_base;

export function getTokenCount(text = "") {
	const trimedText = text
		.replace(/<\/?(em|i)>/g, "*")
		.replace(/<br\s*\/?>|<\/p>/g, "\n")
		.replace(/<(.|\n)*?>/g, "");

	return encode(trimedText).length;
}

import { CharacterModel } from "./class/CharacterModel.mjs";
import { CharacterView } from "./class/CharacterView.mjs";
import { insertFormating } from "./class/Hotkey.js";
import { Notes } from "./class/Notes.mjs";
import { RoomModel } from "./class/RoomModel.mjs";
import { StoryModule } from "./class/Story.js";
import { SystemPromptModule } from "./class/SystemPrompt.js";
import { TavernDate } from "./class/TavernDate.js";
import { Tavern } from "./class/Tavern.js";
import { UIMasterSettings } from "./class/UIMasterSettings.mjs";
import { UIWorldInfoMain } from "./class/UIWorldInfoMain.mjs";
import { WPP } from "./class/WPP.mjs";
import {
	addHeaderAndCopyToCodeBlock,
	countOccurrences,
	debounce,
	isOdd,
	restoreCaretPosition,
	saveCaretPosition,
} from "./class/utils.mjs";

let token;
let data_delete_chat = {};
let default_avatar = "img/fluffy.png";
let user_avatar = "you.png";

let requestTimeout = 60 * 1000;
let getStatusInterval = 5 * 60 * 1000;

let max_context = 2048;
let is_room = false;
let is_room_list = false;
let Rooms = null;

export let templates;
export let main_api = "kobold";
export let lock_context_size = false;
export let multigen = false;
export let singleline = false;
export let swipes = false;
export let keep_dialog_examples = false;
export let free_char_name_mode = false;
export let anchor_order = 0;
export let pygmalion_formating = 0;
export let style_anchor = true;
export let character_anchor = true;
export const gap_holder = 120;
export let online_status = "no_connection";

let chat_name;
const VERSION = "1.5.0";

const version_support_mes = `
	<div style="display: flex; align-items: center; justify-content: space-between;">
		<a id="verson" href="https://github.com/TavernAI/TavernAI" target="_blank">@@@TavernAI v${VERSION}@@@</a>
		<a href="https://boosty.to/tavernai" target="_blank">
			<div id="characloud_url">
				<img src="img/heart.png" style="width:18px; height:18px; margin-right:2px;">
				<div id="characloud_title">Support</div>
			</div>
		</a>
	</div>`.replace(/[\n\r]/g, "");

/*
var chloeMes = {
        name: 'Chloe',
        is_user: false,
        is_name: true,
        create_date: 0,
        mes: '*You went inside. The air smelled of fried meat, tobacco and a hint of wine. A dim light was cast by candles, and a fire crackled in the fireplace. It seems to be a very pleasant place. Behind the wooden bar is an elf waitress, she is smiling. Her ears are very pointy, and there is a twinkle in her eye. She wears glasses and a white apron. As soon as she noticed you, she immediately came right up close to you.*\n\n' +
            ' Hello there! How is your evening going?' +
            '<div id="characloud_img"><img src="img/tavern.png" id="chloe_star_dust_city"></div>\n<a id="verson" href="https://github.com/TavernAI/TavernAI" target="_blank">@@@TavernAI v'+VERSION+'@@@</a><a href="https://boosty.to/tavernai" target="_blank"><div id="characloud_url"><img src="img/cloud_logo.png"><div id="characloud_title">Support</div></div></a><br><br><br><br>',
        chid: -2
    };
*/

let chloeMes = {
	name: "Chloe",
	is_user: false,
	is_name: true,
	create_date: 0,
	mes:
		"*You went outside. The air smelled of saltwater, rum and barbecue. A bright sun shone down from the clear blue sky, glinting off the ocean waves. It seems to be a lively place. Behind the wooden counter of the open-air bar is an elf barmaid grinning cheekily. Her ears are very pointy, and there is a twinkle in her eye. She wears glasses and a white apron. She noticed you right away.*\n\n" +
		'<q class="quotes_highlight">Hi! How is your day going?</q>' +
		'<div id="characloud_img"><img src="img/tavern_summer.png" id="chloe_star_dust_city"></div>\n' +
		version_support_mes,
	chid: -2,
};
export let chat = [chloeMes];

// KoboldAI settings
export let settings;
export let koboldai_settings;
export let koboldai_setting_names;
export let preset_settings = "gui";

export let temp = 0.5;
export let top_p = 1.0;
export let top_k = 0;
export let top_a = 0.0;
export let typical = 1.0;
export let tfs = 1.0;
export let amount_gen = 80;
export let rep_pen = 1;
export let rep_pen_size = 100;
export let rep_pen_slope = 0.9;

// NovelAI settings

export let api_key_novel = "";
export let novel_tier;
export let model_novel = "euterpe-v2";
export let novelai_settings;
export let novelai_setting_names;
export let preset_settings_novel = "Classic-Krake";

export let temp_novel = 0.5;
export let rep_pen_novel = 1;
export let rep_pen_size_novel = 100;
export let rep_pen_slope_novel = 0.9;
export let top_p_novel = 1.0;
export let top_k_novel = 0;
export let top_a_novel = 0.0;
export let typical_novel = 1.0;
export let tfs_novel = 1.0;
export let amount_gen_novel = 80;

// Persets
export let persets_setting_names;
export let persets_settings;

// OpenAI settings
export let perset_settings_openai = "Default";

export let model_openai = "gpt-3.5-turbo";
export let temp_openai = 0.9;
export let top_p_openai = 1.0;
export let pres_pen_openai = 0.7;
export let freq_pen_openai = 0.7;
export let amount_gen_openai = 220;
export let max_context_openai = 2048;

export let openai_stream = false;
export let openai_enhance_definitions = false;
export let openai_send_jailbreak = false;
export let openai_nsfw_encouraged = false;
export let openai_nsfw_prioritized = false;

// Proxy settings
export let perset_settings_proxy = "Default";

export let model_proxy = "";
export let temp_proxy = 0.9;
export let top_p_proxy = 1.0;
export let pres_pen_proxy = 0.7;
export let freq_pen_proxy = 0.7;
export let amount_gen_proxy = 220;
export let max_context_proxy = 2048;

export let proxy_stream = false;
export let proxy_enhance_definitions = false;
export let proxy_send_jailbreak = false;
export let proxy_nsfw_encouraged = false;
export let proxy_nsfw_prioritized = false;

export let fix_markdown = false;

export const user_customization = new Map();

let models_holder_openai = [];
let is_need_load_models_proxy = true;

// HORDE
export let horde_api_key = "0000000000";
export let horde_model = "";

Tavern.hordeCheck = false;
Tavern.is_send_press = false; //Send generation

export let characterFormat = "webp";

function vl(text) {
	//Validation security function for html
	return !text ? text : window.DOMPurify.sanitize(text);
}

export function getIsRoom() {
	return is_room;
}

export function getIsRoomList() {
	return is_room_list;
}

export function getRoomsInstance() {
	return Rooms;
}

/**
 * @param {JQuery<any>} textarea
 */
export function textareaAutosize(textarea) {
	textarea.attr("style", "");
	let texarea_height = textarea.height();
	textarea.css("height", "auto");

	const height = Math.max(textarea.prop("scrollHeight"), texarea_height);
	textarea.css("height", height + "px");
}

/**
 * @param {any[]} dataTransferItems
 * @param {string[]} types
 */
function filterFiles(dataTransferItems, types = []) {
	types = types.map((v) => v.toString().toLowerCase());
	let filtered = [];

	for (let i = 0; i < dataTransferItems.length; i++) {
		if (!types.length || types.indexOf(dataTransferItems[i].type.toLowerCase()) >= 0) {
			filtered.push(dataTransferItems[i]);
		}
	}
	return filtered;
}

/* TODO: temporary; this should be handled by a general UI manager of some kind */
export function characterAddedSign(file_name, alert_text = "Character created") {
	$("#rm_info_block").transition({ opacity: 0, duration: 0 });
	var $prev_img = $("#avatar_div_container").clone();

	if (file_name) {
		$prev_img.children("img").attr("src", "characters/" + file_name + "." + characterFormat);
	} else {
		$prev_img.children("img").attr("src", "img/fluffy.png");
	}
	$("#rm_info_avatar").append($prev_img);
	select_rm_info(alert_text);

	$("#rm_info_block").transition({ opacity: 1.0, duration: 2000 });
}

export function select_rm_info(text) {
	$("#rm_charaters_block").css("display", "none");
	$("#rm_api_block").css("display", "none");
	$("#rm_ch_create_block").css("display", "none");
	$("#rm_style_block").css("display", "none");

	$("#rm_info_block").css("display", "flex");
	$("#rm_info_text").html("<h3>" + text + "</h3>");

	$("#rm_button_characters")
		.children("h2")
		.removeClass("seleced_button_style")
		.addClass("deselected_button_style");

	$("#rm_button_settings")
		.children("h2")
		.removeClass("seleced_button_style")
		.addClass("deselected_button_style");

	$("#rm_button_selected_ch")
		.children("h2")
		.removeClass("seleced_button_style")
		.addClass("deselected_button_style");

	$("#rm_button_style")
		.children("h2")
		.removeClass("seleced_button_style")
		.addClass("deselected_button_style");
}

export function isChatModel() {
	// Checking is it chat model (for OpenAI and proxy)
	let checked_model;
	if (main_api === "openai") {
		checked_model = model_openai;
	} else if (main_api === "proxy") {
		checked_model = model_proxy;
	}
	if (
		checked_model === "text-davinci-003" ||
		checked_model === "text-davinci-002" ||
		checked_model === "text-curie-001" ||
		checked_model === "text-babbage-001" ||
		checked_model === "text-ada-001" ||
		checked_model === "code-davinci-002"
	) {
		return false;
	} else {
		return true;
	}
}

export { default_avatar, filterFiles, max_context, requestTimeout, token, vl };

export var animation_rm_duration = 200;
export var animation_rm_easing = "";

export var SystemPrompt = new SystemPromptModule();

export var Characters = new CharacterModel({
	container: document.getElementById("rm_print_charaters_block"),
	input: {
		newCharacter: document.getElementById("rm_button_create"),
		addFolder: [document.getElementById("character-button-new-folder")],
		importFiles: [document.getElementById("character-button-import")],
		sortSelect: document.getElementById("rm_folder_order"),
		searchInput: document.getElementById("rm_search_bar"),
	},
	containerEditor: document.getElementById("form_create"),
	containerEditorAdvanced: document.getElementById("shadow_charedit_advanced_popup"),
});

export var MasterSettings = new UIMasterSettings({
	root: document.getElementById("master_settings_popup"),
});

$(() => {
	const saveSettingsDebounce = debounce(() => saveSettings(), 500);
	const saveColorStylesDebounce = debounce(() => saveColorStyles(), 1000);
	const getStatusOpenAIDebounce = debounce(
		() => getStatusOpenAI(),
		getStatusInterval > 0 ? getStatusInterval : Number.MAX_SAFE_INTEGER,
	);

	let rootStyle = getComputedStyle($(":root")[0]);
	$.each(rootStyle, function (_, property) {
		if (property.startsWith("--") && property.endsWith("color")) {
			const style = rootStyle.getPropertyValue(property);
			user_customization.set(property, style);

			$(".text_color_input_container").find(`[data-variable='${property}']`).val(style);
		}
	});

	/*
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                const img = mutation.target;
                const aspectRatio = img.height / img.width;
                if (aspectRatio > img.parentNode.offsetHeight / img.parentNode.offsetWidth) {
                    $(img).removeClass('landscape').addClass('portrait');
                } else {
                    $(img).removeClass('portrait').addClass('landscape');
                }
            } else if (mutation.addedNodes) {
                $(mutation.addedNodes).find('.avatar img').each(function() {
                    const img = this;
                    const aspectRatio = img.height / img.width;

                    if (aspectRatio > img.parentNode.offsetHeight / img.parentNode.offsetWidth) {
                        $(img).removeClass('landscape').addClass('portrait');
                    } else {
                        $(img).removeClass('portrait').addClass('landscape');
                    }
                });
            }
        });
    });

    const config = { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] };
    observer.observe(document.body, config);
    */

	/**
	 * Function to change the context/mode from/to "room" or "character", given parameter value.
	 * This function does not affect the character/room list, which should be handled separately.
	 * Will update the is_room variable.
	 * @param {*} room Switch to "room" mode if true
	 */
	function setRoomMode(room) {
		const isOpenAI = main_api === "openai";
		const current_perset =
			persets_settings[
				persets_setting_names[isOpenAI ? perset_settings_openai : perset_settings_proxy]
			];

		if (room) {
			SystemPrompt.select(
				current_perset.system_prompt_preset_room ?? SystemPrompt.empty_prest_id,
			);

			is_room = true;
			$("#option_select_chat").css("display", "none");
		} else {
			SystemPrompt.select(
				current_perset.system_prompt_preset_chat ?? SystemPrompt.empty_prest_id,
			);

			is_room = false;
			$("#option_select_chat").css("display", "block");
			$("#select_chat").css("display", "block");
		}

		// Needed since we need to update the winNotes (Notes on chat or room, switcing whether saveChat() or saveChatRoom() is used)
		if (!is_room)
			winNotes = new Notes({
				root: document.getElementById("shadow_notes_popup"),
				save: saveChat.bind(this),
			});
		else
			winNotes = new Notes({
				root: document.getElementById("shadow_notes_popup"),
				save: saveChatRoom.bind(this),
			});
	}

	SystemPrompt.on(SystemPromptModule.SAVE_SETTINGS, function (event) {
		const isOpenAI = main_api === "openai";

		if (getIsRoom()) {
			if (isOpenAI) {
				settings.openAI.system_prompt_preset_room = SystemPrompt.selected_preset_name;
			} else {
				settings.proxy.system_prompt_preset_room = SystemPrompt.selected_preset_name;
			}
		} else {
			if (isOpenAI) {
				settings.openAI.system_prompt_preset_chat = SystemPrompt.selected_preset_name;
			} else {
				settings.proxy.system_prompt_preset_chat = SystemPrompt.selected_preset_name;
			}
		}

		saveSettingsDebounce();
	});

	Characters.on(
		CharacterModel.EVENT_WIPE_CHAT,
		function () {
			clearChat();
			chat.length = 0;
			printMessages();
		}.bind(this),
	);

	Characters.on(
		CharacterModel.EVENT_ERROR,
		function (event) {
			if (event.error) callPopup(event.error, "alert_error");
		}.bind(this),
	);

	Characters.on(
		CharacterView.EVENT_CHARACTER_SELECT,
		function (event) {
			let was_room = is_room; // Needed so that the chat interface is updated when switching from room to character
			setRoomMode(false);

			$("#chat_story_button").css("display", "block");
			if (!event.is_this_character_selected || was_room) {
				Tavern.mode = "chat";

				if (
					Characters.selectedID >= 0 &&
					Characters.id[Characters.selectedID].online === true
				) {
					$("#character_online_editor").attr("value", "🢤 Online Editor");
					document.getElementById("chat_header_char_info").innerHTML =
						' designed by <a user_name="' +
						Characters.id[Characters.selectedID].user_name +
						'" class="chat_header_char_info_user_name">' +
						vl(Characters.id[Characters.selectedID].user_name_view) +
						"</a>";
				} else {
					$("#character_online_editor").attr("value", "🢤 Publish Card");
					$("#chat_header_char_info").text("designed by User");
				}

				$("#chat_header_char_name").text(Characters.id[Characters.selectedID].name);
				this_edit_mes_id = undefined;
				selected_button = "character_edit";
				$("#chat_header_back_button").css("display", "block");

				clearChat();
				chat.length = 0;
				getChat();

				if (
					($("#characloud_character_page").css("display") === "none" &&
						$("#characloud_user_profile_block").css("display") === "none") ||
					$("#chara_cloud").css("display") === "none"
				) {
					hideCharaCloud();
				}
			} else {
				$("#rm_button_selected_ch").trigger("click");
			}
		}.bind(this),
	);

	Characters.on(
		CharacterModel.EVENT_EDITOR_CLOSED,
		function (event) {
			selected_button = "characters";
			select_rm_characters();
		}.bind(this),
	);

	Characters.on(
		CharacterModel.EVENT_CHARACTER_UPDATED,
		function (event) {
			clearChat();
			chat.length = 0;
			getChat();
		}.bind(this),
	);

	Rooms = new RoomModel({
		characters: Characters,
	});

	Rooms.on(
		RoomModel.EVENT_ROOM_SELECT,
		function (event) {
			let a = null;

			if (!Rooms.loaded) {
				a = Rooms.loadAll();
				Rooms.loaded = true;
			}

			// if(!is_room)
			// {
			//     // console.log(Rooms.id[0].name);
			//     // is_room = true;
			//     // getChatRoom();
			//     let a = Rooms.loadAll();
			//     console.log(Rooms.id);
			// }
			// // else
			// //     is_room = false;

			let defaultImg = "img/fluffy.png";

			$("#rm_print_rooms_block").empty();
			Rooms.id.forEach(function (room) {
				let roomName = room.filename.replace(/\.[^/.]+$/, "");
				$("#rm_print_rooms_block").append(
					`
					<li class="folder-content" filename="${roomName}">
						<div> 
							<div class="content">
								<div class="avatar">
									<img src="${defaultImg}">
								</div>

								<div class="nameTag name">
									${roomName}
								</div>
							</div>

							<button class="delete" title="Delete">

							</button>
						</div>
					</li>
					`,
				);
			});

			$("#rm_print_rooms_block li").on("click", function (event) {
				$("#chat_story_button").css("display", "none");
				setRoomMode(true);

				// let filename = event.currentTarget.firstChild.lastChild.textContent;
				let filename = event.currentTarget.getAttribute("filename");

				Rooms.selectedRoom = filename;
				$("#chat_header_back_button").css("display", "block");

				getChatRoom(filename);
				if (
					($("#characloud_character_page").css("display") === "none" &&
						$("#characloud_user_profile_block").css("display") === "none") ||
					$("#chara_cloud").css("display") === "none"
				) {
					hideCharaCloud();
				}
			});

			$("#rm_print_rooms_block li .delete").on("click", function (event) {
				event.stopPropagation();
				let filename = event.currentTarget.parentNode.parentNode.getAttribute("filename");
				if (!confirm('Delete room "' + filename + '"?')) {
					return;
				}

				Rooms.deleteRoom(filename);
				// event.currentTarget.parentNode.parentNode.remove(); // Remove the HTML node inside the list
				// setRoomMode(false); // Since removing a room redirects to the default Chloe message, which is a character not a room. Also handles the bug that prevents accessing a character after deleting a room.
			});
		}.bind(this),
	);

	// Below is needed currently since the room view class (RoomView) is not implemented yet
	Rooms.on(RoomModel.EVENT_ROOM_DELETED, function (event) {
		let filename = event.filename; // Remove the HTML node inside the list
		$("#rm_print_rooms_block li[filename='" + filename + "']").remove();
		setRoomMode(false); // Since removing a room redirects to the default Chloe message, which is a character not a room. Also handles the bug that prevents accessing a character after deleting a room.
	});

	// Below segment would never be called, since advanced room updating is not implemented
	Rooms.on(
		RoomModel.EVENT_ROOM_UPDATED,
		function (event) {
			clearChat();
			chat.length = 0;
			getChatRoom(Rooms.selectedRoom);
		}.bind(this),
	);

	Characters.view.on(CharacterView.EVENT_CHARACTER_DELETE, function (event) {
		if (is_room) {
			let removedId = Characters.getIDbyFilename(event.target);
			if (Rooms.selectedCharacters.includes(removedId)) {
				Tavern.mode = "chat";
				Rooms.clearSelected();
				Characters.emit(CharacterModel.EVENT_WIPE_CHAT, {});
				document.getElementById("chat_header_back_button").click();
			}
		}
	});

	// Rooms.id[0] = {};
	// Rooms.id[0].name = "sample";
	// Rooms.loadAll();

	$("#characters_rooms_switch_button").on("click", function () {
		Rooms.emit(RoomModel.EVENT_ROOM_SELECT, {});
		if (!is_room_list) {
			$("#character_list").css("display", "none");
			$("#room_list").css("display", "grid");
			$("#characters_rooms_switch_button_characters_text").css("opacity", 0.5);
			$("#characters_rooms_switch_button_rooms_text").css("opacity", 1.0);
			$("#rm_button_characters").children("h2").html("Rooms");

			is_room_list = true;
		} else {
			$("#character_list").css("display", "grid");
			$("#room_list").css("display", "none");
			$("#characters_rooms_switch_button_characters_text").css("opacity", 1.0);
			$("#characters_rooms_switch_button_rooms_text").css("opacity", 0.5);
			$("#rm_button_characters").children("h2").html("Characters");

			is_room_list = false;
		}
	});

	//Drag drop import characters
	$("body").on("dragenter", function (e) {
		if (is_mobile_user) {
			return;
		}
		e.preventDefault();
		if (e.originalEvent.dataTransfer.types) {
			if (
				e.originalEvent.dataTransfer.types[1] === "Files" ||
				e.originalEvent.dataTransfer.types[0] === "Files"
			) {
				$("#drag_drop_shadow").css("display", "flex");
			}
		}
	});

	$("body").on("dragover", function (e) {
		if (is_mobile_user) return;

		e.preventDefault();
	});

	$("body").on("dragleave", function (e) {
		if (is_mobile_user) return;

		e.preventDefault();

		if (e.relatedTarget !== this && !$.contains(this, e.relatedTarget)) {
			$("#drag_drop_shadow").css("display", "none");
		}
	});

	$("body").on("drop", function (e) {
		if (is_mobile_user) return;

		e.preventDefault();
		$("#drag_drop_shadow").css("display", "none");
	});

	//Story
	var Story = new StoryModule();

	Story.on(
		StoryModule.SAVE_CHAT,
		function (event) {
			chat = [];
			chat[0] = {
				name: name2,
				is_user: false,
				is_name: true,
				send_date: Date.now(),
				mes: $("#story_textarea").val(),
			};
			saveChat();
		}.bind(this),
	);

	Story.on(
		StoryModule.CONVERT_CHAT,
		function (event) {
			if (Tavern.mode === "story") {
				if (chat.length === 1) {
					$("#story_textarea").val(chat[0].mes);
				} else {
					let story_text = "";
					chat.forEach(function (item, i) {
						if (item.is_user) {
							story_text += `${name1}: ${item.mes}\n`;
						} else {
							story_text += `${item.name}: ${item.mes}\n`;
						}
					});
					chat = [];
					chat[0] = {
						name: name2,
						is_user: false,
						is_name: true,
						send_date: Date.now(),
						mes: story_text,
					};

					$("#story_textarea").val(story_text);
				}
				saveChat();
				return;
			}

			if (Tavern.mode === "chat") {
				let story_text = $("#story_textarea").val();
				let chat_messages = story_text.split(new RegExp(`(${name1}|${name2}): `));

				chat_messages.shift();
				if (chat_messages.length <= 1) {
					chat_messages = [name2, story_text];
				}
				chat = [];
				for (let i = 0; i < chat_messages.length; i++) {
					let name = chat_messages[i];
					let message = "";
					let is_user = false;
					let is_name = true;
					if (chat_messages[i + 1] !== undefined) {
						message = chat_messages[i + 1];
					}

					if (name === name1) {
						is_user = true;
					}
					const chat_message = {
						name,
						is_user,
						is_name,
						send_date: Date.now(),
						mes: $.trim(message),
					};
					chat.push(chat_message);
					i++;
				}
				saveChat();
				clearChat();
				printMessages();
				return;
			}
		}.bind(this),
	);

	Story.on(
		StoryModule.UPDATE_HORDE_STATUS,
		function (event) {
			updateHordeStats();
		}.bind(this),
	);

	Story.on(
		StoryModule.CONVERT_ALERT,
		function (event) {
			callPopup(
				'<h3 style="margin-bottom:2px;margin-top:5px;">Convert chat to text?</h3>In some cases, the reverse conversion to the chat will be in a modified form.',
				"convert_to_story",
			);
		}.bind(this),
	);

	//CharaCloud
	let charaCloud = charaCloudClient.getInstance();
	let characloud_characters = [];
	let characloud_characters_rows;
	let charaCloudServer = "http://127.0.0.1:80";
	///////////
	// let converter = new showdown.Converter({ extensions: ["xssfilter"] });
	let bg_menu_toggle = false;
	let default_user_name = "You";
	let name1 = default_user_name;
	let name2 = "Chloe";

	/**
	 * @type {AbortController | null}
	 */
	let chat_abort_controller = null;

	let number_bg = 1;
	let delete_user_avatar_filename;
	let chat_create_date = 0;
	let default_ch_mes = "Hello";
	let count_view_mes = 0;
	let mesStr = "";
	let generatedPromtCache = "";
	let backgrounds = [];
	let is_colab = false;
	let is_checked_colab = false;
	let is_mes_reload_avatar = false;
	let is_nav_closed = false;

	let is_advanced_char_open = false;
	let is_master_settings_open = false;
	let menu_type = ""; // what is selected in the menu
	let selected_button = ""; // which button pressed

	// create pole save
	let create_save_name = "";
	let create_save_description = "";
	let create_save_personality = "";
	let create_save_first_message = "";
	let create_save_avatar = "";
	let create_save_scenario = "";
	let create_save_mes_example = "";

	let use_reg_recaptcha = false;

	let timerSaveEdit;
	let durationSaveEdit = 300;
	//animation right menu
	let animation_rm_duration = 200;
	let animation_rm_easing = "";

	let popup_type = "";
	let bg_file_for_del = "";

	let api_server = "";
	let horde_api_server = "";
	//let interval_timer = setInterval(getStatus, 2000);
	let interval_timer_novel = setInterval(getStatusNovel, 3000);
	let is_get_status = false;
	let is_get_status_novel = false;
	let is_get_status_openai = false;
	let is_api_button_press = false;
	let is_api_button_press_novel = false;
	let is_api_button_press_openai = false;

	let add_mes_without_animation = false;

	let this_del_mes = 0;

	let this_edit_mes_text = "";
	let this_edit_mes_chname = "";
	let this_edit_mes_id;
	let this_edit_target_id = undefined;
	let this_max_gen = 0;

	const delay = (ms) => new Promise((res) => setTimeout(res, ms));

	let is_pygmalion = false;
	const pygmalion_formatng_string_indicator = " (Pyg. formatting on)";
	let tokens_already_generated = 0;
	let this_amount_gen = 0;
	let message_already_generated = "";
	let if_typing_text = false;
	const tokens_first_request_count = 50;
	const tokens_cycle_count = 30;
	let cycle_count_generation = 0;

	let winNotes;
	let winWorldInfo;

	let generateType;
	let isImpersonate = () => generateType === "impersonate";

	//Profile
	let is_login = false;
	let ALPHA_KEY = getCookie("ALPHA_KEY");
	let BETA_KEY;
	let login = getCookie("login");
	let login_view = getCookie("login_view");

	let runGenerate;

	const default_api_url_openai = "https://api.openai.com/v1";

	let api_url_openai = default_api_url_openai;
	let api_key_openai = "";

	let api_url_proxy = "";
	let api_key_proxy = "";

	let switch_log_reg = "login";

	//css
	let bg1_toggle = true;
	let css_mes_bg = $('<div class="mes"></div>').css("background");
	let css_send_form_display = $("<div id=send_form></div>").css("display");

	let colab_ini_step = 1;

	// Marked
	marked.use({ mangle: false, headerIds: false });
	marked.use(
		globalThis.markedHighlight.markedHighlight({
			langPrefix: "hljs language-",
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : "plaintext";
				return hljs.highlight(code, { language }).value;
			},
		}),
	);

	// Mobile
	let is_mobile_user =
		navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iPhone/i);

	let character_sorting_type = "NAME";
	$("#rm_folder_order").on("change", function () {
		character_sorting_type = $("#rm_folder_order").find(":selected").val();
		saveSettingsDebounce();
	});

	jQuery.ajax({
		type: "GET",
		url: "/timeout",
		cache: false,
		contentType: "application/json",
		success: function (data) {
			requestTimeout = data.timeout;
			getStatusInterval = data.getStatusInterval;
		},
		error: function (jqXHR, exception) {
			console.error(jqXHR);
			console.error(exception);
		},
	});

	$("#send_textarea").on("input", function () {
		if ($("#send_textarea").css("--autoresize") === "true") {
			$("#send_textarea").attr("style", "");
			this.style.height = this.scrollHeight + "px";
		}
	});

	setInterval(function () {
		switch (colab_ini_step) {
			case 0:
				$("#colab_popup_text").html("<h3>Initialization</h3>");
				colab_ini_step = 1;
				break;
			case 1:
				$("#colab_popup_text").html("<h3>Initialization.</h3>");
				colab_ini_step = 2;
				break;
			case 2:
				$("#colab_popup_text").html("<h3>Initialization..</h3>");
				colab_ini_step = 3;
				break;
			case 3:
				$("#colab_popup_text").html("<h3>Initialization...</h3>");
				colab_ini_step = 0;
				break;
		}
	}, 500);

	/////////////
	$.ajaxPrefilter((options, originalOptions, xhr) => {
		xhr.setRequestHeader("X-CSRF-Token", token);
	});

	$.get("/csrf-token").then((data) => {
		token = data.token;
		getSettings();
		getLastVersion();
		Characters.loadAll();
		Rooms.loadAll();
		printMessages();
		getBackgrounds();
		getUserAvatars();
	});

	function showCharaCloud() {
		if (!charaCloud.is_init) {
			charaCloudInit();
		}

		$("#shell").css("display", "none");
		$("#chara_cloud").css("display", "block");
		$("#chara_cloud").css("opacity", 0.0);
		$("#chara_cloud").transition({
			opacity: 1.0,
			duration: 300,
			queue: false,
			easing: "",
			complete: function () {},
		});

		/*$('#rm_button_characters').click();*/
		$("#bg_chara_cloud").transition({
			opacity: 1.0,
			duration: 1000,
			queue: false,
			easing: "",
			complete: function () {},
		});

		$("#characloud_search_form").transition({
			opacity: 1.0,
			delay: 270,
			duration: 70,
			queue: false,
			easing: "ease-in-out",
			complete: function () {},
		});
	}

	function hideCharaCloud() {
		$("#shell").css("display", "grid");
		$("#shell").css("opacity", 0.0);
		$("#shell").transition({
			opacity: 1.0,
			duration: 1000,
			easing: "",
			complete: function () {},
		});
		$("#chara_cloud").css("display", "none");
		$("#bg_chara_cloud").transition({
			opacity: 0.0,
			duration: 1200,
			easing: "",
			complete: function () {},
		});
	}

	function checkOnlineStatus() {
		if (online_status == "no_connection") {
			$("#online_status_indicator").removeClass("online_status_indicator_online");
			$("#online_status_indicator2").removeClass("online_status_indicator_online");
			$("#online_status_indicator3").removeClass("online_status_indicator_online");
			$("#online_status_indicator4").removeClass("online_status_indicator_online");
			$("#online_status_indicator").addClass("online_status_indicator_offline");

			$("#online_status").removeAttr("style");
			$("#online_status_text").html("No connection...");
			$("#online_status_indicator2").addClass("online_status_indicator_offline");
			$("#online_status_text2").html("No connection...");
			$("#online_status_indicator3").addClass("online_status_indicator_offline");
			$("#online_status_text3").html("No connection...");
			$("#online_status_indicator4").addClass("online_status_indicator_offline");
			$("#online_status_text4").html("No connection...");
			$("#online_status_indicator_horde").css("background-color", "red");
			$("#online_status_text_horde").html("No connection...");

			is_get_status = false;
			is_get_status_novel = false;
			is_get_status_openai = false;
		} else {
			$("#online_status_indicator").removeClass("online_status_indicator_offline");
			$("#online_status_indicator2").removeClass("online_status_indicator_offline");
			$("#online_status_indicator3").removeClass("online_status_indicator_offline");
			$("#online_status_indicator4").removeClass("online_status_indicator_offline");
			$("#online_status_indicator").addClass("online_status_indicator_online");

			$("#online_status").css({ opacity: 0, display: "none" });
			$("#online_status_text").html("");
			$("#online_status_indicator2").addClass("online_status_indicator_online");
			$("#online_status_text2").html(online_status);
			$("#online_status_indicator3").addClass("online_status_indicator_online");
			$("#online_status_text3").html(online_status);
			$("#online_status_indicator4").addClass("online_status_indicator_online");
			$("#online_status_text4").html(online_status);
			$("#online_status_indicator_horde").css("background-color", "green");
			$("#online_status_text_horde").html(online_status);
		}
	}

	async function getLastVersion() {
		jQuery.ajax({
			type: "POST", //
			url: "/getlastversion", //
			data: JSON.stringify({
				"": "",
			}),
			beforeSend: function () {},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			//processData: false,
			success: function (data) {
				var getVersion = data.version;
				if (getVersion !== "error" && getVersion != undefined) {
					if (compareVersions(getVersion, VERSION) === 1) {
						$("#verson").append(
							' <span id="new_version_title">(New update @' + getVersion + ")</span>",
						);
						$("#characloud_status_button").css("display", "flex");
						$("#characloud_status_button").text("New update " + getVersion);
					}
				}
			},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	$("#characloud_status_button").on("click", function () {
		window.open("https://github.com/TavernAI/TavernAI", "_blank");
	});

	function setPygmalionFormating() {
		if (online_status != "no_connection") {
			online_status = online_status.replace(pygmalion_formatng_string_indicator, "");

			switch (pygmalion_formating) {
				case 1:
					is_pygmalion = true;
					online_status += pygmalion_formatng_string_indicator;
					break;
				case 2:
					is_pygmalion = false;
					break;

				default:
					if (online_status.toLowerCase().indexOf("pygmalion") != -1) {
						is_pygmalion = true;
						online_status += pygmalion_formatng_string_indicator;
					} else {
						is_pygmalion = false;
					}
					break;
			}
		}
	}

	async function getStatus() {
		if (is_get_status) {
			jQuery.ajax({
				type: "POST", //
				url: "/getstatus", //
				data: JSON.stringify({
					api_server: api_server,
				}),
				beforeSend: function () {
					if (is_api_button_press) {
						//$("#api_loading").css("display", 'inline-block');
						//$("#api_button").css("display", 'none');
					}
					//$('#create_button').attr('value','Creating...'); //
				},
				cache: false,
				timeout: requestTimeout,
				dataType: "json",
				crossDomain: true,
				contentType: "application/json",
				//processData: false,
				success: function (data) {
					online_status = data.result;
					if (online_status == undefined) {
						online_status = "no_connection";
					}
					setPygmalionFormating();

					//console.log(online_status);
					resultCheckStatus();
					if (online_status !== "no_connection") {
						if (getStatusInterval > 0) {
							setTimeout(getStatus, 3000); //getStatus();
						}
					}
				},
				error: function (jqXHR, exception) {
					console.log(exception);
					console.log(jqXHR);
					online_status = "no_connection";

					resultCheckStatus();
				},
			});
		} else {
			if (is_get_status_novel != true && is_get_status_openai != true) {
				online_status = "no_connection";
			}
		}
	}

	function resultCheckStatus() {
		is_api_button_press = false;
		checkOnlineStatus();

		$("#api_loading").css("display", "none");
		if (is_mobile_user) {
			$("#api_button").css("display", "block");
		} else {
			$("#api_button").css("display", "inline-block");
		}
	}

	// HORDE
	async function getStatusHorde() {
		if (is_get_status) {
			var data = { type: "text" };

			jQuery.ajax({
				type: "POST", //
				url: "/getstatus_horde", //
				data: JSON.stringify(data),
				beforeSend: function () {
					//$('#create_button').attr('value','Creating...');
				},
				cache: false,
				dataType: "json",
				contentType: "application/json",
				success: function (data) {
					if (!("error" in data)) online_status = "Models list fetched and updated";

					document.getElementById("hordeQueue").innerHTML =
						"Connected, model not chosen.";

					$("#horde_model_select").empty();
					$("#horde_model_select").append(
						$("<option></option>").val("").html("-- Select Model --"),
					);
					$.each(data, function (i, p) {
						$("#horde_model_select").append(
							$("<option></option>")
								.val(p.name)
								.html("[" + p.count.toString() + "] - " + p.name),
						);
					});

					is_pygmalion = true;
					if (is_colab) {
						let selectElement = $("#horde_model_select");
						let numOptions = selectElement.children("option").length;
						let randomIndex = Math.floor(Math.random() * numOptions);
						if (randomIndex === 0) {
							randomIndex++;
						}
						selectElement.prop("selectedIndex", randomIndex);
						selectElement.trigger("change");
						$("#colab_shadow_popup").css("display", "none");
					}
					resultCheckStatusHorde();
				},
				error: function (jqXHR, exception) {
					document.getElementById("hordeQueue").innerHTML =
						"Unable to connect to Kobold Horde.";
					online_status = "no_connection";
					$("#horde_model_select").empty();
					$("#horde_model_select").append(
						$("<option></option>").val("").html("-- Connect to Horde for models --"),
					);

					console.log(exception);
					console.log(jqXHR);
					resultCheckStatusHorde();
				},
			});
		} else {
			if (!is_get_status && !is_get_status_novel) {
				online_status = "no_connection";
			}
		}
	}

	function resultCheckStatusHorde() {
		is_api_button_press = false;
		checkOnlineStatus();
		$("#api_loading_horde").css("display", "none");
		$("#api_button_horde").css("display", "inline-block");
	}

	async function getBackgrounds() {
		const response = await fetch("/getbackgrounds", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": token,
			},
			body: JSON.stringify({}),
		});

		if (response.ok === true) {
			const getData = await response.json();
			//background = getData;
			//console.log(getData.length);
			const bg_example_container = document.createElement("div");
			bg_example_container.classList.add("bg_example_container");

			for (var i = 0; i < getData.length; i++) {
				const child_div = document.createElement("div");

				child_div.classList.add("bg_example");
				child_div.innerHTML =
					"<img bgfile='" +
					getData[i] +
					"' class=bg_example_img src='backgrounds/" +
					getData[i] +
					"'><img bgfile='" +
					getData[i] +
					"' class=bg_example_cross src=img/cross.png></div>";

				bg_example_container.appendChild(child_div);
			}

			$("#bg_menu_content").append(bg_example_container);
			//var aa = JSON.parse(getData[0]);
			//const load_ch_coint = Object.getOwnPropertyNames(getData);
		}
	}

	async function isColab() {
		is_checked_colab = true;
		const response = await fetch("/iscolab", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": token,
			},
			body: JSON.stringify({ "": "" }),
		});
		if (response.ok === true) {
			const getData = await response.json();
			if (getData.colab_type !== undefined) {
				is_colab = true;
				let url;

				if (getData.colab_type == "kobold_model") {
					$("#main_api").val("kobold");
					$("#main_api").change();

					if (String(getData.colaburl).indexOf("cloudflare")) {
						url = String(getData.colaburl).split("flare.com")[0] + "flare.com";
					} else {
						url = String(getData.colaburl).split("loca.lt")[0] + "loca.lt";
					}

					$("#api_url_text").val(url);
					setTimeout(function () {
						$("#api_button").trigger("click");
						$("#colab_shadow_popup").css("display", "none");
					}, 2000);
				}

				if (getData.colab_type == "kobold_horde") {
					main_api = "horde";
					$("#main_api").val("horde");
					$("#main_api").change();
					setTimeout(function () {
						$("#api_button_horde").trigger("click");
					}, 2000);
				}

				if (getData.colab_type == "openai") {
					url = getData.colaburl;
					main_api = "openai";
					$("#main_api").val("openai");
					$("#main_api").trigger("change");
					$("#api_url_openai").val(url);
					setTimeout(function () {
						$("#api_button_openai").trigger("click");
						$("#colab_shadow_popup").css("display", "none");
					}, 1000);
				}

				if (getData.colab_type == "free_launch") {
					//url = getData.colaburl;
					main_api = "openai";
					$("#main_api").val("openai");
					$("#main_api").change();
					//$('#api_key_openai').val(url);
					setTimeout(function () {
						//$('#api_button_openai').click();
						$("#colab_shadow_popup").css("display", "none");
					}, 1000);
				}
			}
		}
	}

	async function setBackground(bg) {
		jQuery.ajax({
			type: "POST", //
			url: "/setbackground", //
			data: JSON.stringify({
				bg: bg,
			}),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...'); //
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			//processData: false,
			success: function (html) {},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	async function delBackground(bg) {
		const response = await fetch("/delbackground", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": token,
			},
			body: JSON.stringify({ bg: bg }),
		});
		if (response.ok === true) {
			//const getData = await response.json();
			//background = getData;
			//var aa = JSON.parse(getData[0]);
			//const load_ch_coint = Object.getOwnPropertyNames(getData);
		}
	}

	function printMessages() {
		if (Tavern.mode === "chat") {
			let missing_chars = [];
			chat.forEach(function (item, i, arr) {
				// if(is_room && !imageExists(getMessageAvatar(item)) && missing_chars.indexOf(item.name) === -1)
				//     missing_chars.push(item.name);
				// console.log(item.name + " : " + imageExists(getMessageAvatar(item)));
				if (
					is_room &&
					!getMessageAvatar(item, Date.now()) &&
					missing_chars.indexOf(item.name) === -1
				)
					missing_chars.push(item.name);

				addOneMessage(item);
			});

			if (is_room && missing_chars.length) {
				let msg =
					"Cannot load one or more character images. The characters might have been deleted.\nMissing Characters: ";
				missing_chars.forEach(function (curName, i) {
					// selectedCharactersIdBuffer.length is equal to data[0]['character_names'].length
					if (i < missing_chars.length - 1) msg += curName + ", ";
					else msg += curName + ".";
				});
				msg += "\nYou can still use the chat room, but some images might be missing.";
				callPopup(msg, "alert");
			}
		}
		if (Tavern.mode === "story") {
			$("#story_textarea").val(chat[0].mes);
			let textArea = chat[0].mes;
			$("#story_textarea").val(textArea);
			/*
            $('#story_textarea').val(textArea.substring(0, 5) +
                        '<span class="highlight">' +
                        textArea.substring(5, 10) +
                        '</span>' +
                        textArea.substring(10));
            */
		}
	}

	function clearChat() {
		count_view_mes = 0;
		Story.showHide();
		$("#chat").html("");
		$("#story_textarea").val("");
	}

	/**
	 * @param {string} text
	 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern/blob/2befcd87124f30e09496a02e7ce203c3d9ba15fd/public/scripts/power-user.js#L242>
	 */
	function fixMarkdown(text) {
		// fix formatting problems in markdown
		// e.g.:
		// "^example * text*\n" -> "^example *text*\n"
		// "^*example * text\n" -> "^*example* text\n"
		// "^example *text *\n" -> "^example *text*\n"
		// "^* example * text\n" -> "^*example* text\n"
		// take note that the side you move the asterisk depends on where its pairing is
		// i.e. both of the following strings have the same broken asterisk ' * ',
		// but you move the first to the left and the second to the right, to match the non-broken asterisk "^example * text*\n" "^*example * text\n"
		// and you HAVE to handle the cases where multiple pairs of asterisks exist in the same line
		// i.e. "^example * text* * harder problem *\n" -> "^example *text* *harder problem*\n"

		// Find pairs of formatting characters and capture the text in between them
		const format = /(\*|_|~){1,2}([\s\S]*?)\1{1,2}/gm;
		let matches = [];
		let match;
		while ((match = format.exec(text)) !== null) {
			matches.push(match);
		}

		// Iterate through the matches and replace adjacent spaces immediately beside formatting characters
		let newText = text;
		for (let i = matches.length - 1; i >= 0; i--) {
			let matchText = matches[i][0];
			let replacementText = matchText.replace(/(\*|_|~)(\s+)|(\s+)(\*|_|~)/g, "$1$4");
			newText =
				newText.slice(0, matches[i].index) +
				replacementText +
				newText.slice(matches[i].index + matchText.length);
		}

		return newText;
	}

	/**
	 * @param {string} ch_name
	 * @param {string} mes
	 */
	function messageFormating(mes, ch_name) {
		//if(Characters.selectedID != undefined) mes = mes.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
		//for Chloe
		if (Characters.selectedID === undefined) {
			mes = mes
				.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
				.replace(/\*(.+?)\*/g, "<i>$1</i>")
				.replace(/\n/g, "<br/>");
		} else {
			if (fix_markdown) mes = fixMarkdown(mes);

			mes = mes.replace(
				// /```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|(\".+?\")|(\u201C.+?\u201D)/gm,
				/```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|((\u201C|\").+?(\u201D|\"))/gm,
				function (match, p1) {
					if (p1) {
						const quote_text = p1.replace(/[\u201C\u201D\"]/g, "");

						return `<q class="quotes_highlight">${quote_text}</q>`;
					}

					return match;
				},
			);

			mes = marked.parse(mes);
			mes = mes.replace(/<code(.*)>[\s\S]*?<\/code>/g, function (match) {
				// Firefox creates extra newlines from <br>s in code blocks, so we replace them before converting newlines to <br>s.
				return match.replace(/\n/gm, "\u0000");
			});

			mes = mes.replace(/\n/g, "<br/>");
			mes = mes.replace(/\u0000/g, "\n"); // Restore converted newlines
			mes = mes.trim();

			mes = mes.replace(/<code(.*)>[\s\S]*?<\/code>/g, function (match) {
				return match.replace(/&amp;/g, "&");
			});

			mes = window.DOMPurify.sanitize(mes);
		}

		if (ch_name !== name1) {
			if (!is_room) {
				mes = mes.replaceAll(name2 + ":", "");
			} else {
				mes = mes.replaceAll(ch_name + ":", "");
			}
		}

		return mes;
	}

	function getMessageAvatar(mes) {
		var avatarImg = "User Avatars/" + user_avatar;
		if (!mes.is_user) {
			if (Characters.selectedID === undefined) {
				avatarImg = "img/chloe_summer.png";
			} else {
				//mes.chid = mes.chid || parseInt(Characters.selectedID);
				if (!is_room) {
					mes.chid = parseInt(Characters.selectedID); // TODO: properly establish persistent ids

					avatarImg =
						Characters.id[mes.chid].filename == "none"
							? "img/fluffy.png"
							: "characters/" +
							  Characters.id[Characters.selectedID].filename +
							  "?v=" +
							  Date.now();
				} else {
					if (mes.chid === undefined) mes.chid = parseInt(Characters.selectedID);

					if (Characters.id[mes.chid] !== undefined) {
						avatarImg =
							Characters.id[mes.chid].filename == "none"
								? "img/fluffy.png"
								: "characters/" +
								  Characters.id[mes.chid].filename +
								  "?v=" +
								  Date.now();
					} else {
						avatarImg = undefined;
					}
				}
			}
		} else {
			delete mes.chid;
		}
		return avatarImg;
	}

	function createNewMessageContainer(mes, characterName, avatarImg) {
		let mes_container = $(
			`<div class="mes" mesid="${count_view_mes}" ch_name="${vl(characterName)}" is_user="${
				mes.is_user
			}"></div>`,
		);

		// Delete checkbox
		mes_container.append(
			'<div class="for_checkbox"></div><input type="checkbox" class="del_checkbox">',
		);

		// Avatar
		mes_container.append(
			`
			<div class="avatar">
				<img class="avt_img" src="${avatarImg}">
			</div>`,
		);

		let messageBlock = $('<div class="mes_block"></div>');
		messageBlock.append('<div class="ch_name">' + vl(characterName) + "</div>"); // character name block
		messageBlock.append('<select class="name_select"></select>'); // character name selector for editing
		mes_container.append(messageBlock);

		// Message content
		messageBlock.append('<div class="mes_text"></div>');

		// Edit/Copy Button
		mes_container.append(
			`<div class="mes_btn_group">
				<button title="Copy" class="mes_copy"> <i class="fa-solid fa-copy fa-xl"></i> </button>
				<button title="Edit" class="mes_edit"> <i class="fa-solid fa-pen-to-square fa-xl"></i> </button>
			</div>`,
		);

		// edit menu shown when edit button is pressed
		let editMenu = $('<div class="edit_block"></div>');

		// Confirm button
		editMenu.append(
			`
			<button class="mes_edit_done">
				<i class="fa-regular fa-circle-check fa-xl" style="color: #3ae800;"></i>
			</button>
			`,
		);

		// Copy Message Button
		editMenu.append(
			`
			<button class="mes_edit_clone" title="Create copy">
				<i class="fa-solid fa-clone fa-xl"></i>
			</button>
			`,
		);

		// Delete Button
		editMenu.append(
			`
			<button class="mes_edit_delete" title="Delete">
				<i class="fa-solid fa-trash fa-xl"></i>
			</button>
			`,
		);

		// Move Up Button
		editMenu.append(
			`
			<button class="mes_up" title="Move up">
				<i class="fa-solid fa-caret-up fa-xl"></i>
			</button>
			`,
		);

		// Move Down Button
		editMenu.append(
			`
			<button class="mes_down">
				<i class="fa-solid fa-caret-down fa-xl"></i>
			</button>
			`,
		);

		// Cancel Button
		editMenu.append(
			`
			<button class="mes_edit_cancel">
				<i class="fa-solid fa-ban fa-xl" style="color: #ff0f15;"></i>
			</button>
			`,
		);

		mes_container.append(editMenu);

		// Message count
		mes_container.append(
			`<div class="mes_index">
				<span> #${parseInt(count_view_mes) + 1} </span>
			</div>`,
		);

		/* Swipes */
		mes_container.append(
			`<button type="button" class="swipe_left">
				<div>
					<i class="fa-solid fa-chevron-left fa-xl"></i>
				</div>
			</button>`,
		);

		mes_container.append(
			`<button type="button" class="swipe_right">
				<div>
					<i class="fa-solid fa-chevron-right fa-xl"></i>

					<div class="swipe_counter"> </div>
				</div>
			</button>`,
		);

		// Token count
		let tokenCounter = $('<div class="token_counter" title="Token count"> - </div>');
		mes_container.append(tokenCounter);

		return mes_container;
	}

	function addOneMessage(mes, type = "normal") {
		let messageText = type !== "swipe" ? mes["mes"] : mes["swipes"][mes["swipe_id"]];
		let characterName = name1;

		generatedPromtCache = "";
		let avatarImg = getMessageAvatar(mes);
		if (!mes.is_user) {
			if (!is_room) {
				mes.chid = Characters.selectedID; // TODO: properly establish persistent ids
			}

			if (!is_room) {
				characterName = Characters.id[mes.chid] ? Characters.id[mes.chid].name : "Chloe";
			} else {
				characterName = mes.name; // In case there are character(s) chatted in a room, but has been removed by the user
			}
		}

		if (count_view_mes == 0) {
			messageText = formatMessageName(messageText);
		}

		let originalText = String(messageText);
		messageText = messageFormating(messageText, characterName);

		let container = null;
		if (type !== "swipe") {
			container = createNewMessageContainer(mes, characterName, avatarImg);

			$("#chat").append(container);
		}

		if (type === "swipe") {
			const prev_mes = $("#chat")
				.children()
				.filter(`[mesid="${count_view_mes - 1}"]`);

			const swipe_count = chat[chat.length - 1]["swipes"].length;
			const current_count = chat[chat.length - 1]["swipe_id"] + 1;

			prev_mes.find(".mes_text").html(messageText);
			prev_mes.children(".token_counter").html(String(getTokenCount(originalText)));

			prev_mes.find(".swipe_counter").text(`${current_count} / ${swipe_count}`);

			if (mes["swipe_id"] !== 0 && swipes) {
				prev_mes.children(".swipe_right").css("display", "block");
				prev_mes.children(".swipe_left").css("display", "block");
			}

			addHeaderAndCopyToCodeBlock(prev_mes);
		} else {
			const current_mes = $("#chat").children().filter(`[mesid="${count_view_mes}"]`);

			current_mes.find(".mes_text").html(messageText);
			current_mes.children(".token_counter").html(String(getTokenCount(originalText)));

			if (chat[chat.length - 1].swipes) {
				const swipe_count = chat[chat.length - 1]["swipes"].length;
				const current_count = chat[chat.length - 1]["swipe_id"] + 1;

				current_mes.find(".swipe_counter").text(`${current_count} / ${swipe_count}`);
			} else {
				current_mes.find(".swipe_counter").text("1 / 1");
			}

			hideSwipeButtons();

			if (
				parseInt(chat.length - 1) === parseInt(count_view_mes) &&
				!mes["is_user"] &&
				swipes
			) {
				if (mes["swipe_id"] === undefined && count_view_mes !== 0) {
					current_mes.children(".swipe_right").css("display", "block");
				} else if (mes["swipe_id"] !== undefined) {
					if (mes["swipe_id"] === 0) {
						current_mes.children(".swipe_right").css("display", "block");
					} else {
						current_mes.children(".swipe_right").css("display", "block");
						current_mes.children(".swipe_left").css("display", "block");
					}
				}
			}

			addHeaderAndCopyToCodeBlock(current_mes);
		}

		if (type !== "swipe") count_view_mes++;

		if (!add_mes_without_animation && type !== "swipe") {
			$("#chat .mes").last().css("opacity", 0).transition({
				opacity: 1.0,
				duration: 250,
				easing: "",
			});
		} else {
			add_mes_without_animation = false;
		}

		let $textchat = $("#chat");

		$("#chat .mes").last().addClass("last_mes");
		$("#chat .mes").eq(-2).removeClass("last_mes");

		if (is_auto_scroll)
			$textchat[0].scrollTo({ top: $textchat[0].scrollHeight, behavior: "smooth" });

		return container;
	}

	async function addOneMessageStream(
		mes,
		{ isFirst, isFinal = false, type = "normal", isError = false },
	) {
		let $textchat = $("#chat");

		let messageText = mes["mes"];
		let characterName = name1;

		generatedPromtCache = "";
		let avatarImg = getMessageAvatar(mes);

		if (!mes.is_user) {
			if (!is_room) {
				mes.chid = Characters.selectedID; // TODO: properly establish persistent ids
			}

			if (!is_room) {
				characterName = Characters.id[mes.chid] ? Characters.id[mes.chid].name : "Chloe";
			} else {
				characterName = mes.name; // In case there are character(s) chatted in a room, but has been removed by the user
			}
		}

		if (count_view_mes === 0) {
			messageText = formatMessageName(messageText);
		}

		// const charsToBalance = ["_", "*", '"'];
		// for (const char of charsToBalance) {
		// 	if (!isFinal && isOdd(countOccurrences(messageText, char))) {
		// 		// Add character at the end to balance it
		// 		messageText = messageText.trimEnd() + char;
		// 	}
		// }

		let originalText = String(messageText);
		messageText = messageFormating(messageText, characterName);

		if (isFinal) {
			showSwipeButton(mes, type);

			if (type === "swipe") {
				const prev_mes = $("#chat")
					.children()
					.filter(`[mesid="${count_view_mes - 1}"]`);

				const swipe_count = chat[chat.length - 1]["swipes"].length;
				const current_count = chat[chat.length - 1]["swipe_id"] + 1;

				prev_mes.children(".token_counter").html(String(getTokenCount(originalText)));
				prev_mes.find(".swipe_counter").text(`${current_count} / ${swipe_count}`);
			} else {
				const current_mes = $("#chat").children().filter(`[mesid="${count_view_mes}"]`);

				current_mes.children(".token_counter").html(String(getTokenCount(originalText)));
				current_mes.find(".swipe_counter").text("1 / 1");

				count_view_mes++;
			}

			const $chat_mes = $("#chat .mes");

			$chat_mes
				.last()
				.children(".mes_edit")
				.css({ display: "block " })
				.transition({
					opacity: 0.3,
					duration: 250,
					easing: "ease",
					complete: function () {
						$(this).css({ opacity: "" });
					},
				});

			$chat_mes.last().addClass("last_mes");
			$chat_mes.eq(-2).removeClass("last_mes");

			if (is_auto_scroll)
				$textchat[0].scrollTo({ top: $textchat[0].scrollHeight, behavior: "smooth" });

			return;
		}

		if (type !== "swipe" && isFirst) {
			let container = createNewMessageContainer(mes, characterName, avatarImg);

			$("#chat").append(container);
		}

		// Hide edit button while streaming
		if (isFirst) {
			const last_mes = $("#chat .mes").last();
			last_mes.children(".mes_edit").css({ opacity: 0, display: "none" });

			if (!add_mes_without_animation && type !== "swipe") {
				last_mes.css("opacity", 0).transition({ opacity: 1.0, duration: 250, easing: "" });
			} else {
				add_mes_without_animation = false;
			}
		}

		if (type === "swipe") {
			const prev_mes = $("#chat")
				.children()
				.filter(`[mesid="${count_view_mes - 1}"]`);

			prev_mes.children(".mes_block").children(".mes_text").html(messageText);

			addHeaderAndCopyToCodeBlock(prev_mes);
		} else {
			const current_mes = $("#chat").children().filter(`[mesid="${count_view_mes}"]`);

			current_mes.children(".mes_block").children(".mes_text").html(messageText);

			hideSwipeButtons();
			addHeaderAndCopyToCodeBlock(current_mes);
		}

		if (is_auto_scroll) $textchat.scrollTop($textchat[0].scrollHeight);
	}

	function showSwipeButton(mes, type) {
		if (type === "swipe") {
			const prev_mes = $("#chat")
				.children()
				.filter(`[mesid="${count_view_mes - 1}"]`);

			if (mes["swipe_id"] !== 0 && swipes) {
				prev_mes.children(".swipe_right").css("display", "block");
				prev_mes.children(".swipe_left").css("display", "block");
			}
		} else {
			let current_mes;

			if (type !== "impersonate") {
				current_mes = $("#chat").children().filter(`[mesid="${count_view_mes}"]`);

				const chatLength = parseInt(chat.length - 1);
				const countLength = parseInt(count_view_mes);

				if (!(chatLength === countLength && !mes["is_user"] && swipes)) return;
			} else {
				current_mes = $("#chat")
					.children()
					.filter(`[mesid="${count_view_mes - 1}"]`);

				if (current_mes.attr("is_user") === "true") return;
			}

			if (parseInt(current_mes.attr("mesid")) === 0) return;

			if (mes["swipe_id"] === undefined && count_view_mes !== 0) {
				current_mes.children(".swipe_right").css("display", "block");
			} else if (mes["swipe_id"] !== undefined) {
				if (mes["swipe_id"] === 0) {
					current_mes.children(".swipe_right").css("display", "block");
				} else {
					current_mes.children(".swipe_right").css("display", "block");
					current_mes.children(".swipe_left").css("display", "block");
				}
			}
		}
	}

	function typeWriter(target, text, speed, i) {
		if (i < text.length) {
			//target.append(text.charAt(i));
			target.html(target.html() + text.charAt(i));
			i++;
			setTimeout(() => typeWriter(target, text, speed, i), speed);
		}
	}

	function newMesPattern(name) {
		//Patern which denotes a new message
		return name + ":";
	}

	$("#send_button").on("click", function () {
		if (!Tavern.is_send_press && $("#send_mes").css("display") === "block") {
			hideSwipeButtons();

			Tavern.is_send_press = true;
			if (Tavern.mode === "story") {
				Story.Generate();
			} else {
				Generate();
			}

			textareaAutosize($("#send_textarea"));
			return;
		}

		if (Tavern.is_send_press && $("#cancel_mes").css("display") === "block") {
			if (chat_abort_controller) {
				chat_abort_controller.abort();
			}

			$("#send_textarea").removeAttr("disabled");
			Tavern.is_send_press = false;
			Tavern.hordeCheck = false;

			$("#send_mes").css({ display: "block" });
			$("#cancel_mes")
				.css({ display: "none" })
				.removeClass("fa-circle-stop")
				.addClass("fa-hourglass fa-spin");
		}
	});

	$("#send_button")
		.on("mouseenter", function () {
			// Check if Tavern.is_send_press is true before proceeding
			if (!Tavern.is_send_press) return;

			// Find the icon and start the animation
			let icon = $(this).find("#cancel_mes");

			icon.removeClass("fa-hourglass fa-spin").addClass("fa-circle-stop");
		})
		.on("mouseleave", function () {
			// Check if Tavern.is_send_press is true before proceeding
			if (!Tavern.is_send_press) return;

			// Find the icon and start the animation
			let icon = $(this).find("#cancel_mes");

			icon.removeClass("fa-circle-stop").addClass("fa-hourglass fa-spin");
		});

	/**
	 * @param {string} prompt
	 */
	function formatMessageName(prompt, isImpersonate = false) {
		const [user, ai] = !isImpersonate ? [name1, name2] : [name2, name1];

		return prompt
			.replace(/{{user}}/gi, user)
			.replace(/{{char}}/gi, ai)
			.replace(/<USER>/gi, user)
			.replace(/<BOT>/gi, ai);
	}

	async function Generate(type) {
		let this_gap_holder = gap_holder;
		let originalName2 = name2;

		// console.log((type === 'swipe' || (type === 'regenerate' && !chat[chat.length-1]['is_user'])) && is_room);
		// if((type === 'swipe' || (type === 'regenerate' && !chat[chat.length-1]['is_user'])) && is_room)
		//     Rooms.setPreviousActiveCharacter();
		// else if((type === 'swipe' || (type === 'regenerate' && chat[chat.length-1]['is_user'])) && is_room)
		//     Rooms.setActiveCharacterId(chat); // Needs to be done since we don't know the latest message made by a character

		if ((type === "swipe" || type === "regenerate") && is_room) {
			if (!chat[chat.length - 1]["is_user"]) Rooms.setPreviousActiveCharacter();
			else Rooms.setActiveCharacterId(chat); // Needs to be done since we don't know the latest message made by a character
		}

		generateType = type;

		// HORDE
		if (main_api == "horde" && horde_model == "") {
			document.getElementById("hordeInfo").classList.remove("hidden");
			document.getElementById("hordeQueue").innerHTML = "Error: no horde model chosen.";
			return;
		} else {
			document.getElementById("hordeInfo").classList.add("hidden");
		}

		if ((main_api === "openai" || main_api === "proxy") && isChatModel()) {
			if (main_api === "openai")
				this_gap_holder = parseInt(amount_gen_openai) + this_gap_holder;
			else this_gap_holder = parseInt(amount_gen_proxy) + this_gap_holder;
		}

		var textareaText = "";
		tokens_already_generated = 0;

		if (online_status !== "no_connection" && Characters.selectedID !== undefined) {
			name2 = Characters.id[Characters.selectedID].name;

			if (!free_char_name_mode) {
				message_already_generated = name2 + ": ";
			} else {
				message_already_generated = "";
			}

			Characters.id[Characters.selectedID].last_action_date = Date.now();
			$("#rm_folder_order").trigger("change");

			if (!is_room) {
				Characters.thisCharacterSave(); // Depending on how the expected behaviour (character save or not for rooms), this line might be changed
			}

			if (type === "regenerate") {
				textareaText = "";

				//If last message from ai
				if (!chat[chat.length - 1]["is_user"]) {
					chat.length = chat.length - 1;
					count_view_mes -= 1;

					$("#chat").children().last().remove();
				}
			} else {
				if (type !== "swipe") {
					textareaText = $("#send_textarea").val();
					$("#send_textarea").val("");
				}
			}
			//$("#send_textarea").attr("disabled","disabled");
			//$("#send_textarea").blur();

			$("#send_mes").css({ display: "none" });
			$("#cancel_mes").css({ display: "block" });

			var storyString = "";
			var userSendString = "";
			var finalPromt = "";

			var postAnchorChar = "talks a lot with descriptions"; //'Talk a lot with description what is going on around';// in asterisks
			var postAnchorStyle = "Writing style: very long messages"; //"[Genre: roleplay chat][Tone: very long messages with descriptions]";

			var anchorTop = "";
			var anchorBottom = "";
			var topAnchorDepth = 8;

			if (character_anchor && !is_pygmalion) {
				if (anchor_order === 0) {
					anchorTop = name2 + " " + postAnchorChar;
				} else {
					anchorBottom = "[" + name2 + " " + postAnchorChar + "]";
				}
			}
			if (style_anchor && !is_pygmalion) {
				if (anchor_order === 1) {
					anchorTop = postAnchorStyle;
				} else {
					anchorBottom = "[" + postAnchorStyle + "]";
				}
			}

			//*********************************
			//PRE FORMATING STRING
			//*********************************
			if (textareaText != "") {
				chat[chat.length] = {};
				chat[chat.length - 1] = {
					name: name1,
					is_user: true,
					is_name: true,
					send_date: Date.now(),
					mes: textareaText,
				};

				addOneMessage(chat[chat.length - 1]);
			}

			var chatString = "";
			var arrMes = [];
			var mesSend = [];

			var charDescription = Characters.id[Characters.selectedID].description.replace(
				/\r/g,
				"",
			);

			var charPersonality = Characters.id[Characters.selectedID].personality.trim();
			var inject = "";

			let wDesc = WPP.parseExtended(charDescription);

			// Below section might be useless/not working as expected if user is in a room
			if (settings.notes && winNotes.strategy === "discr") {
				charDescription = WPP.stringifyExtended(
					WPP.getMergedExtended(wDesc, winNotes.wppx),
					"line",
				);
			} else if (settings.notes && winNotes.strategy === "prep") {
				inject = formatMessageName(WPP.stringifyExtended(winNotes.wppx) + "\n");
			} else {
				charDescription = WPP.stringifyExtended(wDesc, "line");
			}

			charDescription = charDescription.trim();

			/* World info */
			let prepend = [];
			let append = [];
			if (winWorldInfo.worldName && winWorldInfo.worldName.length) {
				let depth = parseInt(document.getElementById("input_worldinfo_depth").value);
				let budget = parseInt(document.getElementById("input_worldinfo_budget").value);

				let process = [];
				let i = chat.length - 1;
				let k = 0;
				while (chat[i] && i >= 0 && k < depth) {
					process.push(chat[i].mes);
					k++;
					i--;
				}

				let result = winWorldInfo.evaluate(process);
				let totalTokens = 0;
				for (let i = 0; i < result.prepend.length; i++) {
					const isAppend = !result.prepend[i];
					const candidate = result.prepend[i] ? result.prepend[i] : result.append[i];
					totalTokens += encode(candidate);
					if (totalTokens > budget) {
						break;
					}
					(isAppend ? append : prepend).push(candidate);
				}
			}

			var Scenario = "";
			if (!is_room) {
				Scenario = Characters.id[Characters.selectedID].scenario.trim();
			} else {
				Scenario = Rooms.id[Rooms.selectedRoomId].chat[0].scenario.trim();
			}
			var mesExamples = Characters.id[Characters.selectedID].mes_example.trim();

			var checkMesExample = mesExamples.replace(/<START>/gi, "").trim(); //for check length without tag
			if (checkMesExample.length == 0) mesExamples = "";
			var mesExamplesArray = [];

			//***Base replace***
			if (mesExamples !== undefined) {
				if (mesExamples.length > 0) {
					if (is_pygmalion) {
						mesExamples = mesExamples.replace(/{{user}}:/gi, "You:");
						mesExamples = mesExamples.replace(/<USER>:/gi, "You:");
					}
					mesExamples = formatMessageName(mesExamples);

					//mesExamples = mesExamples.replaceAll('<START>', '[An example of how '+name2+' responds]');
					let blocks = mesExamples.split(/<START>/gi);
					mesExamplesArray = blocks.slice(1).map((block) => `<START>\n${block.trim()}\n`);
				}
			}

			if (charDescription) {
				charDescription = formatMessageName(charDescription);
			}
			if (charPersonality) {
				charPersonality = formatMessageName(charPersonality);
			}
			if (Scenario) {
				Scenario = formatMessageName(Scenario);
			}

			if (is_pygmalion) {
				if (charDescription) {
					storyString = name2 + "'s Persona: " + charDescription + "\n";
				}
				if (charPersonality) {
					storyString += "Personality: " + charPersonality + "\n";
				}
				if (Scenario) {
					storyString += "Scenario: " + Scenario + "\n";
				}
			} else {
				if (charDescription) {
					if (charPersonality) {
						charPersonality = name2 + "'s personality: " + charPersonality; //"["+name2+"'s personality: "+charPersonality+"]";
					}
				}
				if (charDescription.trim()) {
					if (charDescription.slice(-1) !== "]" || charDescription.substr(0, 1) !== "[") {
						//charDescription = '['+charDescription+']';
					}

					storyString += charDescription + "\n";
				}

				if (count_view_mes < topAnchorDepth) {
					storyString += charPersonality + "\n";
				}
			}

			if (main_api == "kobold") {
				if (prepend.length) {
					storyString = prepend.join("\n") + "\n" + storyString;
				}

				if (append.length) {
					storyString = storyString + append.join("\n") + "\n";
				}

				storyString = storyString.replace(/\n+/g, "\n");
			}

			if (main_api === "openai" || (main_api === "proxy" && isChatModel())) {
				const isOpenAI = main_api === "openai";

				const this_nsfw_prioritized = isOpenAI
						? openai_nsfw_prioritized
						: proxy_nsfw_prioritized,
					this_nsfw_encouraged = isOpenAI
						? openai_nsfw_encouraged
						: proxy_nsfw_encouraged,
					this_enhance_definitions = isOpenAI
						? openai_enhance_definitions
						: proxy_enhance_definitions;

				let sp_string =
					generateType !== "impersonate"
						? SystemPrompt.system_prompt //System prompt
						: "";

				const nsfw_prompt = this_nsfw_encouraged
					? SystemPrompt.nsfw_encouraged_prompt
					: SystemPrompt.nsfw_avoidance_prompt;

				sp_string = this_nsfw_prioritized
					? nsfw_prompt + "\n" + sp_string
					: sp_string + "\n" + nsfw_prompt;

				if (this_enhance_definitions) {
					sp_string += "\n" + SystemPromptModule.default_enhance_definitions;
				}

				storyString = formatMessageName(sp_string) + "\n" + storyString + "\n";
			}

			var count_exm_add = 0;
			var chat2 = [];
			var j = 0;

			for (var i = chat.length - 1; i >= 0; i--) {
				if (j == 0) {
					chat[j]["mes"] = formatMessageName(chat[j]["mes"]);
				}

				let this_mes_ch_name = "";
				if (chat[j]["is_user"]) {
					this_mes_ch_name = name1;
				} else {
					if (!is_room) {
						this_mes_ch_name = name2;
					} else {
						this_mes_ch_name = Characters.id[chat[j]["chid"]].name;
					}
				}

				if (chat[j]["is_name"]) {
					chat2[i] = this_mes_ch_name + ": " + chat[j]["mes"] + "\n";
				} else {
					chat2[i] = chat[j]["mes"] + "\n";
				}

				j++;
			}

			//chat2 = chat2.reverse();
			var this_max_context = 1487;

			if (main_api == "kobold") this_max_context = max_context;
			else if (main_api == "horde") this_max_context = max_context;
			else if (main_api == "novel") {
				if (novel_tier === 1) {
					this_max_context = 1024;
				} else {
					this_max_context = 2048 - 60; //fix for fat tokens
					if (model_novel === "krake-v2") {
						this_max_context -= 160;
					}
					if (model_novel === "clio-v1") {
						this_max_context = 8192;
						this_max_context -= 160; //fix for fat tokens
					}
				}
			} else if (main_api === "openai") this_max_context = max_context_openai;
			else if (main_api === "proxy") this_max_context = max_context_proxy;

			var i = 0;
			let mesExmString = "";
			count_exm_add = 0;

			if (keep_dialog_examples) {
				for (let iii = 0; iii < mesExamplesArray.length; iii++) {
					mesExmString = mesExmString + mesExamplesArray[iii];

					if (!is_pygmalion) {
						mesExamplesArray[iii] = mesExamplesArray[iii].replace(
							/<START>/i,
							"This is how " + name2 + " should talk",
						); //An example of how '+name2+' responds
					}

					count_exm_add++;
				}
			}

			if (type == "swipe") {
				chat2.shift();
			}

			runGenerate = function (cycleGenerationPromt = "") {
				generatedPromtCache += cycleGenerationPromt;

				if (generatedPromtCache.length == 0) {
					chatString = "";
					arrMes = arrMes.reverse();
					var is_add_personality = false;

					if ((main_api === "openai" || main_api === "proxy") && isChatModel()) {
						// Jailbreak
						if (
							SystemPrompt.user_jailbreak_prompt &&
							SystemPrompt.user_jailbreak_prompt.length
						) {
							arrMes[arrMes.length - 1] =
								arrMes[arrMes.length - 1] +
								"\n" +
								formatMessageName(SystemPrompt.user_jailbreak_prompt);
						}

						if (SystemPrompt.jailbreak_prompt.length) {
							//arrMes.splice(-1, 0, jailbreak_prompt);

							arrMes.push(
								formatMessageName(SystemPrompt.jailbreak_prompt, isImpersonate()),
							);
						}
					}

					if (inject && inject.length && arrMes.length) {
						arrMes.splice(arrMes.length - 1, 0, inject);
					}

					arrMes.forEach(function (item, i, arr) {
						//For added anchors and others

						if (
							(i >= arrMes.length - 1 &&
								item.trim().substr(0, (name1 + ":").length) != name1 + ":" &&
								main_api !== "openai" &&
								main_api !== "proxy") ||
							(i >= arrMes.length - 1 &&
								item.trim().substr(0, (name1 + ":").length) != name1 + ":" &&
								(main_api === "openai" || main_api === "proxy") &&
								SystemPrompt.jailbreak_prompt.length === 0)
						) {
							if (textareaText == "") {
								item = item.substr(0, item.length - 1);
							}
						}

						if (
							i === arrMes.length - topAnchorDepth &&
							count_view_mes >= topAnchorDepth &&
							!is_add_personality
						) {
							is_add_personality = true;
							//chatString = chatString.substr(0,chatString.length-1);
							//anchorAndPersonality = "[Genre: roleplay chat][Tone: very long messages with descriptions]";
							if ((anchorTop != "" || charPersonality != "") && !is_pygmalion) {
								if (anchorTop != "") charPersonality += " ";
								item += "[" + charPersonality + anchorTop + "]\n";
							}
						}

						if (
							i >= arrMes.length - 1 &&
							count_view_mes > 8 &&
							item.substring(0, (name1 + ":").length) == name1 + ":" &&
							!is_pygmalion
						) {
							//For add anchor in end
							item = item.substr(0, item.length - 1);
							//chatString+=postAnchor+"\n";//"[Writing style: very long messages]\n";
							item = item + anchorBottom + "\n";
						}

						if (
							!free_char_name_mode &&
							!((main_api === "openai" || main_api === "proxy") && isChatModel())
						) {
							if (
								i >= arrMes.length - 1 &&
								item.trim().substring(0, (name1 + ":").length) == name1 + ":"
							) {
								//for add name2 when user sent
								item = item + name2 + ":";
							}
							if (
								i >= arrMes.length - 1 &&
								item.trim().substring(0, (name1 + ":").length) != name1 + ":"
							) {
								//for add name2 when continue
								if (textareaText == "") {
									item = item + "\n" + name2 + ":";
								}
							}
						}

						if (is_pygmalion) {
							if (item.trim().indexOf(name1) === 0) {
								item = item.replace(name1 + ":", "You:");
							}
						}
						mesSend[mesSend.length] = item;
						//chatString = chatString+item;
					});
				}
				//finalPromt +=chatString;
				//console.log(storyString);

				//console.log(encode(characters[Characters.selectedID].description+chatString).length);
				//console.log(encode(JSON.stringify(characters[Characters.selectedID].description+chatString)).length);

				//console.log(JSON.stringify(storyString));
				//Send story string
				var mesSendString = "";
				var mesExmString = "";

				function setPromtString() {
					mesSendString = "";
					mesExmString = "";
					for (let j = 0; j < count_exm_add; j++) {
						mesExmString += mesExamplesArray[j];
					}
					for (let j = 0; j < mesSend.length; j++) {
						mesSendString += mesSend[j];
						if (
							type === "force_name2" &&
							j === mesSend.length - 1 &&
							tokens_already_generated === 0
						) {
							mesSendString += name2 + ":";
						}
					}
				}

				function checkPromtSize() {
					setPromtString();
					let thisPromtContextSize =
						getTokenCount(
							storyString +
								mesExmString +
								mesSendString +
								anchorTop +
								anchorBottom +
								charPersonality +
								generatedPromtCache,
						) + this_gap_holder;

					if (thisPromtContextSize > this_max_context) {
						if (count_exm_add > 0 && !keep_dialog_examples) {
							//mesExamplesArray.length = mesExamplesArray.length-1;
							count_exm_add--;
							checkPromtSize();
						} else if (mesSend.length > 0) {
							mesSend.shift();
							checkPromtSize();
						} else {
							//end
						}
					}
				}

				if (generatedPromtCache.length > 0) {
					checkPromtSize();
				} else {
					setPromtString();
				}

				if (!is_pygmalion) {
					if (!is_room) {
						mesSendString =
							"\nThen the roleplay chat between " +
							name1 +
							" and " +
							name2 +
							" begins.\n" +
							mesSendString;
					} else {
						mesSendString =
							"\nThen the roleplay chat between " +
							name2 +
							", " +
							name1 +
							" and other character(s) begins. It is " +
							name2 +
							"'s turn to talk.\n" +
							mesSendString;
					}
				} else {
					mesSendString = "<START>\n" + mesSendString;
				}

				if ((main_api === "openai" || main_api === "proxy") && isChatModel()) {
					finalPromt = [];
					const isOpenAI = main_api === "openai";
					const isGPT =
						(isOpenAI ? model_openai : model_proxy)
							.toLowerCase()
							.startsWith("claude") === false;

					const this_send_jailbreak = isOpenAI
						? openai_send_jailbreak
						: proxy_send_jailbreak;

					const main_prompt_content = (storyString + mesExmString)
						.trim()
						.replace(/\n$/, "");

					const [system, user, assistant] = isGPT
						? ["system", "user", "assistant"]
						: ["Assistant", "Human", "Assistant"];

					finalPromt[0] = { role: isGPT ? system : user, content: main_prompt_content };
					mesSend.forEach(function (item, i) {
						const content = item.trim().replace(/\n$/, "");

						if (SystemPrompt.jailbreak_prompt && i === mesSend.length - 1) {
							if (this_send_jailbreak)
								finalPromt[i + 1] = { role: isGPT ? system : user, content };
						} else {
							if (item.indexOf(name1 + ":") === 0) {
								finalPromt[i + 1] = { role: user, content };
							} else {
								finalPromt[i + 1] = { role: assistant, content };
							}
						}
					});

					if (isImpersonate()) {
						if (!SystemPrompt.impersonate_prompt) {
							return callPopup(
								"Impersonate prompt is empty, please set it before use this function.",
								"alert_error",
							);
						}

						finalPromt[finalPromt.length] = {
							role: isGPT ? system : user,
							content: formatMessageName(SystemPrompt.impersonate_prompt),
						};
					}

					if (!isGPT) {
						finalPromt = finalPromt.reduce((prev, curr) => {
							return prev + `${curr.role}: ${curr.content}\n\n`;
						}, "");

						finalPromt += "Assistant: ";
					}

					console.debug(
						"Final Prompt",
						isGPT
							? finalPromt.reduce((p, c) => p + "\n\n" + c.content, "")
							: finalPromt,
					);
				} else {
					finalPromt = storyString + mesExmString + mesSendString + generatedPromtCache;
				}

				var generate_data;
				switch (main_api) {
					case "kobold":
						this_amount_gen = parseInt(amount_gen);
						break;
					case "novel":
						this_amount_gen = parseInt(amount_gen_novel);
						break;
					case "openai":
						this_amount_gen = parseInt(amount_gen_openai);
						break;
					case "proxy":
						this_amount_gen = parseInt(amount_gen_proxy);
						break;
				}

				this_max_gen = this_amount_gen;
				if (multigen && (main_api === "kobold" || main_api === "novel")) {
					//Multigen is not necessary for OpenAI (Uses stop tokens)

					let this_set_context_size;
					if (main_api === "kobold") this_set_context_size = parseInt(amount_gen);
					if (main_api === "novel") this_set_context_size = parseInt(amount_gen_novel);
					if (tokens_already_generated === 0) {
						if (this_set_context_size >= tokens_first_request_count) {
							this_amount_gen = tokens_first_request_count;
						} else {
							this_amount_gen = this_set_context_size;
						}
					} else {
						if (parseInt(amount_gen) - tokens_already_generated < tokens_cycle_count) {
							this_amount_gen = this_set_context_size - tokens_already_generated;
						} else {
							this_amount_gen = tokens_cycle_count;
						}
					}
				}

				if (main_api == "kobold") {
					generate_data = {
						prompt: finalPromt,
						gui_settings: true,
						max_context_length: this_max_context,
						singleline: singleline,
					};
					if (preset_settings != "gui") {
						var this_settings =
							koboldai_settings[koboldai_setting_names[preset_settings]];

						generate_data = {
							prompt: finalPromt,
							gui_settings: false,
							max_context_length: parseInt(this_max_context), //this_settings.max_length,
							max_length: this_amount_gen, //parseInt(amount_gen),
							rep_pen: parseFloat(rep_pen),
							rep_pen_range: parseInt(rep_pen_size),
							rep_pen_slope: parseFloat(rep_pen_slope),
							temperature: parseFloat(temp),
							tfs: parseFloat(tfs),
							top_a: parseFloat(top_a),
							top_k: parseInt(top_k),
							top_p: parseFloat(top_p),
							typical: parseFloat(typical),
							singleline: singleline,
							s1: this_settings.sampler_order[0],
							s2: this_settings.sampler_order[1],
							s3: this_settings.sampler_order[2],
							s4: this_settings.sampler_order[3],
							s5: this_settings.sampler_order[4],
							s6: this_settings.sampler_order[5],
							s7: this_settings.sampler_order[6],
						};
					}
				}

				if (main_api == "novel") {
					var this_settings =
						novelai_settings[novelai_setting_names[preset_settings_novel]];
					generate_data = {
						input: finalPromt,
						model: model_novel,
						use_string: true,
						temperature: parseFloat(temp_novel),
						max_length: this_amount_gen,
						min_length: this_settings.min_length,
						tail_free_sampling: parseFloat(tfs_novel),
						top_a: parseFloat(top_a_novel),
						top_k: parseInt(top_k_novel),
						top_p: parseFloat(top_p_novel),
						typical_p: parseFloat(typical_novel),
						repetition_penalty: parseFloat(rep_pen_novel),
						repetition_penalty_range: parseInt(rep_pen_size_novel),
						repetition_penalty_slope: parseFloat(rep_pen_slope_novel),
						repetition_penalty_frequency: this_settings.repetition_penalty_frequency,
						repetition_penalty_presence: this_settings.repetition_penalty_presence,
						//"stop_sequences": {{187}},
						//bad_words_ids = {{50256}, {0}, {1}};
						//generate_until_sentence = true;
						use_cache: false,
						//use_string = true;
						return_full_text: false,
						prefix: "vanilla",
						order: this_settings.order,
					};
				}

				// HORDE
				if (main_api == "horde") {
					// Same settings as Kobold? Yep
					var this_settings = koboldai_settings[koboldai_setting_names[preset_settings]];
					this_amount_gen = parseInt(amount_gen);

					if (horde_api_key == null) {
						horde_api_key = "0000000000";
					}

					generate_data = {
						prompt: finalPromt,
						horde_api_key: horde_api_key,
						n: 1,
						frmtadsnsp: false,
						frmtrmblln: false,
						frmtrmspch: false,
						frmttriminc: false,
						max_context_length: parseInt(max_context),
						max_length: this_amount_gen,
						rep_pen: parseFloat(rep_pen),
						rep_pen_range: parseInt(rep_pen_size),
						rep_pen_slope: this_settings.rep_pen_slope,
						singleline: singleline || false,
						temperature: parseFloat(temp),
						tfs: this_settings.tfs,
						top_a: this_settings.top_a,
						top_k: this_settings.top_k,
						top_p: this_settings.top_p,
						typical: this_settings.typical,
						s1: this_settings.sampler_order[0],
						s2: this_settings.sampler_order[1],
						s3: this_settings.sampler_order[2],
						s4: this_settings.sampler_order[3],
						s5: this_settings.sampler_order[4],
						s6: this_settings.sampler_order[5],
						s7: this_settings.sampler_order[6],
						models: [horde_model],
					};
				}

				if (main_api === "openai" || main_api === "proxy") {
					const isOpenAI = main_api === "openai";
					let this_model_gen = isOpenAI ? model_openai : model_proxy;

					const stop =
						this_model_gen.toLowerCase().startsWith("claude") === false
							? [(isImpersonate() ? name2 : name1) + ":", "<|endoftext|>"]
							: ["\n\nHuman: ", "\n\nSystem: ", "\n\nAssistant: "];

					generate_data = isOpenAI
						? {
								model: this_model_gen,
								temperature: parseFloat(temp_openai),
								frequency_penalty: parseFloat(freq_pen_openai),
								presence_penalty: parseFloat(pres_pen_openai),
								top_p: parseFloat(top_p_openai),
								stop,
								max_tokens: this_amount_gen,
								stream: openai_stream,
								messages: finalPromt,
						  }
						: {
								model: this_model_gen,
								temperature: parseFloat(temp_proxy),
								frequency_penalty: parseFloat(freq_pen_proxy),
								presence_penalty: parseFloat(pres_pen_proxy),
								top_p: parseFloat(top_p_proxy),
								stop,
								max_tokens: this_amount_gen,
								stream: proxy_stream,
								messages: finalPromt,
						  };
				}

				let generate_url = "";
				if (main_api === "kobold") {
					generate_url = "/generate";
				} else if (main_api === "novel") {
					generate_url = "/generate_novelai";
				} else if (main_api === "horde") {
					generate_url = "/generate_horde";
				} else if (main_api === "openai" || main_api === "proxy") {
					generate_url = "/generate_openai";
				}

				chat_abort_controller = new AbortController();

				fetch(generate_url, {
					method: "POST",
					body: JSON.stringify(generate_data),
					cache: "no-cache",
					signal: chat_abort_controller.signal,
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": token,
					},
				})
					.then((res) => {
						(main_api === "openai" && openai_stream) ||
						(main_api === "proxy" && proxy_stream)
							? generateCallbackStream(res)
							: generateCallback(res);
					})
					.catch((err) => {
						console.error(err);

						$("#send_textarea").removeAttr("disabled");
						$("#send_mes").css({ display: "block" });
						$("#cancel_mes").css({ display: "none" }).trigger("mouseleave");

						Tavern.is_send_press = false;
						Tavern.hordeCheck = false;

						if (chat_abort_controller.signal.aborted) {
							return;
						}

						callPopup(Error(err).message, "alert_error");
					});
			};

			for (var item of chat2) {
				//console.log(encode("dsfs").length);
				chatString = item + chatString;
				if (
					getTokenCount(
						storyString +
							mesExmString +
							chatString +
							anchorTop +
							anchorBottom +
							charPersonality,
					) +
						this_gap_holder <
					this_max_context
				) {
					//(The number of tokens in the entire prompt) need fix, it must count correctly (added +120, so that the description of the character does not hide)
					arrMes[arrMes.length] = item;
				} else {
					i = chat2.length - 1;
				}

				await delay(1); //For disable slow down (encode gpt-2 need fix)
				//console.log(i+' '+chat.length);

				if (i == chat2.length - 1) {
					//arrMes[arrMes.length-1] = '<START>\n'+arrMes[arrMes.length-1];
					if (!keep_dialog_examples) {
						for (let iii = 0; iii < mesExamplesArray.length; iii++) {
							//mesExamplesArray It need to make from end to start

							mesExmString += mesExamplesArray[iii];
							if (
								getTokenCount(
									storyString +
										mesExmString +
										chatString +
										anchorTop +
										anchorBottom +
										charPersonality,
								) +
									this_gap_holder <
								this_max_context
							) {
								//example of dialogs
								if (!is_pygmalion) {
									mesExamplesArray[iii] = mesExamplesArray[iii].replace(
										/<START>/i,
										"This is how " + name2 + " should talk",
									); //An example of how '+name2+' responds
								}
								count_exm_add++;
								await delay(1);

								//arrMes[arrMes.length] = item;
							} else {
								iii = mesExamplesArray.length;
							}
						}
					}

					if (!is_pygmalion) {
						if (Scenario !== undefined) {
							if (Scenario.length > 0) {
								storyString +=
									"Circumstances and context of the dialogue: " + Scenario + "\n";
							}
						}
						//storyString+='\nThen the roleplay chat between '+name1+' and '+name2+' begins.\n';
					}
					runGenerate();
					return;
				}
				i++;
			}
		} else {
			if (Characters.selectedID == undefined) {
				//send ch sel
				callPopup("Character is not selected", "alert");
			}
			Tavern.is_send_press = false;
		}

		name2 = originalName2;

		// // Generally, the active character (The character speaking) changes every message, so below section is needed
		// if(is_room)
		//     select_selected_character(Characters.selectedID);
	}

	/**
	 * @param {string} dataStream
	 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
	 */
	function tryParseStreamingError(dataStream) {
		let data;
		try {
			data = JSON.parse(dataStream.substring(6));
		} catch {}

		// console.log({ data, dataStream });

		// if (data && data.id && data.id.startsWith("chatcmpl-upstream error")) {
		// 	const errorJson = JSON.parse(jsonLines.choices[0].delta.content.match(/({[^{}]*})/)[0]);

		// 	console.error(errorJson);

		// 	const errorMessage = errorJson.message ? errorJson.message : errorJson.proxy_note;

		// 	throw Error(errorMessage);
		// }
	}

	/**
	 * @param {Response} res
	 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
	 */
	function OpenAI_StreamData(res) {
		return async function* stream() {
			const decoder = new TextDecoder();
			const reader = res.body.getReader();

			let getMessage = "";
			let messageBuffer = "";

			const isOpenAI = main_api === "openai";
			const this_model = isOpenAI ? model_openai : model_proxy;

			while (true) {
				const { done, value } = await reader.read();
				let response = decoder.decode(value);

				// Claude's streaming SSE messages are separated by \r
				if (model_openai.toLowerCase().startsWith("claude")) {
					response = response.replace(/\r/g, "");
				}

				let eventList = [];
				// ReadableStream's buffer is not guaranteed to contain full SSE messages as they arrive in chunks

				messageBuffer += response;
				eventList = messageBuffer.split("\n\n");

				// Last element will be an empty string or a leftover partial message
				messageBuffer = eventList.pop();

				for (let event of eventList) {
					tryParseStreamingError(event);

					if (!event.startsWith("data")) continue;
					if (event == "data: [DONE]") return;

					let data = JSON.parse(event.substring(6));

					// the first and last messages are undefined, protect against that
					if (this_model.toLowerCase().startsWith("claude") === false) {
						getMessage += data.choices[0]["delta"]["content"] || "";
					} else {
						getMessage = data.completion;
					}

					yield getMessage;
				}

				if (done) return;
			}
		};
	}

	/**
	 * @param {Response} res
	 */
	async function generateCallbackStream(res) {
		tokens_already_generated += this_amount_gen;

		let fullContent = "";
		let isFirst = true;

		try {
			for await (let content of OpenAI_StreamData(res)()) {
				// Formating message
				const [name_user, name_ai] = isImpersonate() ? [name2, name1] : [name1, name2];

				if (content.indexOf(name_user + ":") !== -1) {
					content = content.substring(0, content.indexOf(name_user + ":"));
				}

				if (content.indexOf("<|endoftext|>") !== -1) {
					content = content.substring(0, content.indexOf("<|endoftext|>"));
				}

				let this_mes_is_name = true;
				if (content.indexOf(name_ai + ":") === 0) {
					content = content.replace(name_ai + ":", "").trimStart();
				} else {
					this_mes_is_name = false;
				}

				content = content.trim();
				fullContent = content;

				if (
					!isImpersonate() &&
					isFirst &&
					(chat[chat.length - 1]["swipe_id"] === undefined ||
						chat[chat.length - 1]["is_user"])
				) {
					generateType = "normal";
				}

				if (isImpersonate()) {
					$("#send_textarea").val(content).trigger("input");
				} else if (generateType === "swipe") {
					const current_chat = chat[chat.length - 1];
					const chat_swipes = current_chat["swipes"];

					if (isFirst) {
						chat_swipes[chat_swipes.length] = content;
					} else {
						chat_swipes[chat_swipes.length - 1] = content;
					}

					current_chat["mes"] = content;

					if (current_chat["swipe_id"] === chat_swipes.length - 1) {
						await addOneMessageStream(current_chat, { isFirst, type: "swipe" });
					}
				} else {
					if (isFirst) {
						chat[chat.length] = {};
						chat[chat.length - 1] = {
							name: name2,
							is_user: false,
							is_name: this_mes_is_name,
							send_date: Date.now(),
						};
					}

					chat[chat.length - 1].mes = content;

					await addOneMessageStream(chat[chat.length - 1], { isFirst });
				}

				if (isFirst) isFirst = false;
			}

			if (isImpersonate()) {
				showSwipeButton(chat[chat.length - 1], "impersonate");
			} else if (generateType === "swipe") {
				await addOneMessageStream(chat[chat.length - 1], {
					isFirst,
					isFinal: true,
					type: "swipe",
				});
			} else {
				await addOneMessageStream(chat[chat.length - 1], { isFirst, isFinal: true });
			}
		} catch (err) {
			if (generateType === "swipe") {
				await addOneMessageStream(chat[chat.length - 1], {
					isFirst,
					isFinal: true,
					isError: true,
					type: "swipe",
				});
			}

			if (generateType === "normal") {
				await addOneMessageStream(chat[chat.length - 1], {
					isFirst,
					isFinal: true,
					isError: true,
				});
			}

			throw new Error(err);
		}

		// Streaming is done
		$("#send_mes").css({ display: "block" });
		$("#cancel_mes").css({ display: "none" }).trigger("mouseleave");

		Tavern.is_send_press = false;

		if (!isImpersonate()) {
			if (!is_room) saveChat();
			else saveChatRoom();
		}

		console.debug("Full message", fullContent);

		// Needs to make sure that the message returned is not empty before changing the next active character
		if (is_room && fullContent.length) Rooms.setNextActiveCharacter();
	}
	/**
	 * @param {Response} res
	 */
	async function generateCallback(res) {
		const data = await res.json();
		tokens_already_generated += this_amount_gen;

		if (data.error) {
			$("#send_mes").css({ display: "block" });
			$("#cancel_mes").css({ display: "none" }).trigger("mouseleave");

			Tavern.is_send_press = false;

			if (data.message) callPopup(data.message, "alert_error");
			return;
		}

		var getMessage = "";
		if (main_api == "kobold") {
			getMessage = data.results[0].text;
		}
		if (main_api == "novel") {
			getMessage = data.output;
		}

		if (main_api == "horde") {
			if (!data.generations || !data.generations.length) {
				console.log("Horde generation request started.");
				Tavern.hordeCheck = true;

				updateHordeStats();
				return;
			} else {
				console.log("Horde generation request finished.");
				getMessage = data.generations[0].text;
			}
		}

		if (main_api === "openai" || main_api === "proxy") {
			if (model_openai.toLowerCase().startsWith("gpt")) {
				getMessage = isChatModel() ? data.choices[0].message.content : data.choices[0].text;
			} else {
				getMessage = data.completion;
			}
		}

		//Multigen run again
		if (multigen && (main_api === "kobold" || main_api === "novel")) {
			if_typing_text = false;

			if (
				generateType === "force_name2" &&
				tokens_already_generated === tokens_first_request_count
			) {
				getMessage = name2 + ": " + getMessage;
			}
			getMessage = getMessage.replace(/\n+$/, "");

			message_already_generated += getMessage;

			if (
				message_already_generated.indexOf("You:") === -1 &&
				message_already_generated.indexOf(name1 + ":") === -1 &&
				message_already_generated.indexOf("<|endoftext|>") === -1 &&
				message_already_generated.indexOf("\\end") === -1 &&
				tokens_already_generated < parseInt(this_max_gen) &&
				getMessage.length > 0
			) {
				runGenerate(getMessage);
				return;
			}

			getMessage = message_already_generated;
		}
		//Formating
		getMessage = getMessage.trim();

		// Formating message

		const [name_user, name_ai] = isImpersonate() ? [name2, name1] : [name1, name2];

		if (is_pygmalion) {
			getMessage = getMessage
				.replace(new RegExp("<USER>", "g"), name_user)
				.replace(new RegExp("<BOT>", "g"), name_ai)
				.replace(new RegExp("You:", "g"), name_user + ":");
		}

		if (getMessage.indexOf(name_user + ":") != -1) {
			getMessage = getMessage.substring(0, getMessage.indexOf(name_user + ":"));
		}

		if (getMessage.indexOf("<|endoftext|>") != -1) {
			getMessage = getMessage.substring(0, getMessage.indexOf("<|endoftext|>"));
		}

		if (getMessage.indexOf("\\end") != -1) {
			getMessage = getMessage.substring(0, getMessage.indexOf("\\end"));
		}

		let this_mes_is_name = true;
		if (getMessage.indexOf(name_ai + ":") === 0) {
			getMessage = getMessage.replace(name_ai + ":", "").trimStart();
		} else {
			this_mes_is_name = false;
		}

		if (generateType === "force_name2") this_mes_is_name = true;
		//getMessage = getMessage.replace(/^\s+/g, '');

		if (getMessage) {
			if (
				!isImpersonate() &&
				(chat[chat.length - 1]["swipe_id"] === undefined ||
					chat[chat.length - 1]["is_user"])
			) {
				generateType = "normal";
			}

			if (isImpersonate()) {
				$("#send_textarea").val(getMessage).trigger("input");
			} else if (generateType === "swipe") {
				const current_chat = chat[chat.length - 1];
				const chat_swipes = current_chat["swipes"];

				chat_swipes[chat_swipes.length] = getMessage;

				if (current_chat["swipe_id"] === chat_swipes.length - 1) {
					current_chat["mes"] = getMessage;
					addOneMessage(current_chat, "swipe");
				} else {
					current_chat["mes"] = getMessage;
				}

				Tavern.is_send_press = false;
			} else {
				chat[chat.length] = {}; //adds one mes in array but then increases length by 1
				chat[chat.length - 1] = {
					name: name2,
					is_user: false,
					is_name: this_mes_is_name,
					send_date: Date.now(),
					mes: getMessage.trim(),
				};

				addOneMessage(chat[chat.length - 1]);
				Tavern.is_send_press = false;
			}

			$("#send_mes").css({ display: "block" });
			$("#cancel_mes").css({ display: "none" });

			if (generateType !== "impersonate") {
				if (!is_room) saveChat();
				else saveChatRoom();
			}
		} else {
			//console.log('run force_name2 protocol');
			if (free_char_name_mode && main_api !== "openai" && main_api !== "proxy") {
				Generate("force_name2");
			} else {
				$("#send_mes").css({ display: "block" });
				$("#cancel_mes").css({ display: "none" }).trigger("mouseleave");

				Tavern.is_send_press = false;
				callPopup("The model returned empty message", "alert");
			}
		}

		// Needs to make sure that the message returned is not empty before changing the next active character
		if (is_room && getMessage.length > 0) Rooms.setNextActiveCharacter();
	}

	function getIDsByNames(ch_names) {
		let ids = [];
		ch_names.forEach(function (name) {
			const ch_ext = ".webp"; // Assumed that character files would always have .webp extension
			ids.push(Characters.getIDbyFilename(name + ch_ext));
		});
		return ids;
	}

	// Assumed that the chat array is filled already
	function assignIDsByNames() {
		chat.forEach(function (mes, i) {
			const ch_ext = ".webp"; // Assumed that character files would always have .webp extension
			chat[i].chid = Characters.getIDbyFilename(mes.name + ch_ext);
		});
	}

	/**
	 *  Note that the clearChat() function (and chat.length = 0 assignment) is already called in this function, calling it before calling this function is redundant
	 */
	async function getChatRoom(filename) {
		//console.log(characters[Characters.selectedID].chat);
		jQuery.ajax({
			type: "POST",
			url: "/getchatroom",
			data: JSON.stringify({
				room_filename: filename,
			}),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {
				// console.log(data);
				//chat.length = 0;
				// if(is_room)
				// {
				//     Rooms.selectedIDs.forEach(function(curId, i) {
				//         if(!Characters.id.includes(curId))
				//         {
				//             let msg = "Cannot load room. Some characters expected are missing. Please check if you have all the characters.";
				//             callPopup(msg, "alert");
				//             return;
				//         }
				//     });
				// }
				if (data[0] !== undefined) {
					// Rooms.selectedCharacterNames = chat[0]['character_names'];
					// Rooms.selectedCharacters = getIDsByNames(chat[0]['character_names']);

					// console.log(data[0]['character_names']);
					// console.log(Characters.id);

					let selectedCharactersIdBuffer = getIDsByNames(data[0]["character_names"]);

					let isMissingChars = false;

					selectedCharactersIdBuffer.forEach(function (curId, i) {
						if (curId < 0) {
							// If name doesn't exist in the Characters.id objects array, then curId will be -1
							let msg =
								"Cannot load room. Some characters expected are missing. Please check if you have all the characters.\nRequired Characters: ";
							for (var i = 0; i < selectedCharactersIdBuffer.length; i++) {
								// selectedCharactersIdBuffer.length is equal to data[0]['character_names'].length
								if (i < selectedCharactersIdBuffer.length - 1)
									msg += data[0]["character_names"][i] + ", ";
								else msg += data[0]["character_names"][i] + ".";
							}
							callPopup(msg, "alert");
							isMissingChars = true;
							return;
						}
					});

					// Don't continue if one or more characters is missing
					if (isMissingChars) return;

					// console.log("Incorrect/Error");
					clearChat();
					chat.length = 0;
					for (let key in data) {
						chat.push(data[key]);
					}
					//chat =  data;
					// const ch_ext = ".webp"; // Assumed that character files would always have .webp extension
					// Characters.selectedID = Characters.getIDbyFilename(chat[0]['character_names'][0]+ch_ext);
					Rooms.selectedCharacterNames = chat[0]["character_names"];
					Rooms.selectedCharacters = getIDsByNames(chat[0]["character_names"]);
					Rooms.activeCharacterIdInit(chat[chat.length - 1]);
					chat_create_date = chat[0]["create_date"];
					winNotes.text = chat[0].notes || "";
					winNotes.strategy = chat[0].notes_type || "discr";
					if (!winNotes.text || !winNotes.text.length) {
						let defaultWpp =
							'[Character("' + Characters.id[Characters.selectedID].name + '"){}]';
						try {
							let parsed = WPP.parse(
								Characters.id[Characters.selectedID].description,
							);
							if (
								parsed[0] &&
								parsed[0].type &&
								parsed[0].type.length &&
								parsed[0].name &&
								parsed[0].name.length
							) {
								defaultWpp = "[" + parsed[0].type + '("' + parsed[0].name + '"){}]';
							}
						} catch (e) {
							/* ignore error */
						}
						winNotes.wppText = defaultWpp;
					}
					chat.shift();
					assignIDsByNames();
				} else {
					chat_create_date = Date.now();
				}

				//console.log(chat);
				getChatResult();
				loadRoomSelectedCharacters();
				saveChatRoom();

				// console.log(data[0]);
			},
			error: function (jqXHR, exception) {
				getChatResult();
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	async function saveChatRoom() {
		chat.forEach(function (item, i) {
			if (item["is_user"]) {
				var str = item["mes"].replace(name1 + ":", default_user_name + ":");
				chat[i]["mes"] = str;
				chat[i]["name"] = default_user_name;
			} else if (i !== chat.length - 1) {
				if (chat[i]["swipe_id"] !== undefined) {
					delete chat[i]["swipes"];
					delete chat[i]["swipe_id"];
				}
			}
		});
		var save_chat = [
			{
				user_name: default_user_name,
				character_names: Rooms.selectedCharacterNames,
				create_date: chat_create_date,
				notes: winNotes.text,
				notes_type: winNotes.strategy,
				scenario: Rooms.id[Rooms.selectedRoomId].chat[0].scenario,
			},
			...chat,
		];

		jQuery.ajax({
			type: "POST",
			url: "/savechatroom",
			data: JSON.stringify({ filename: Rooms.selectedRoom, chat: save_chat }),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	async function saveChat() {
		chat.forEach(function (item, i) {
			if (item["is_user"]) {
				var str = item["mes"].replace(name1 + ":", default_user_name + ":");
				chat[i]["mes"] = str;
				chat[i]["name"] = default_user_name;
			} else if (i !== chat.length - 1) {
				if (chat[i]["swipe_id"] !== undefined) {
					delete chat[i]["swipes"];
					delete chat[i]["swipe_id"];
				}
			}
		});

		var save_chat = [
			{
				user_name: default_user_name,
				character_name: name2,
				create_date: chat_create_date,
				notes: winNotes.text,
				notes_type: winNotes.strategy,
				mode: Tavern.mode,
			},
			...chat,
		];

		if (chat_name !== undefined) {
			save_chat[0].chat_name = chat_name;
		}

		jQuery.ajax({
			type: "POST",
			url: "/savechat",
			data: JSON.stringify({
				ch_name: Characters.id[Characters.selectedID].name,
				file_name: Characters.id[Characters.selectedID].chat,
				chat: save_chat,
				card_filename: Characters.id[Characters.selectedID].filename,
			}),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	async function getChat() {
		//console.log(characters[Characters.selectedID].chat);
		jQuery.ajax({
			type: "POST",
			url: "/getchat",
			data: JSON.stringify({
				ch_name: Characters.id[Characters.selectedID].name,
				file_name: Characters.id[Characters.selectedID].chat,
				card_filename: Characters.id[Characters.selectedID].filename,
			}),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {
				//chat.length = 0;
				Tavern.mode = "chat";

				if (data[0] !== undefined) {
					for (let key in data) {
						chat.push(data[key]);
					}

					//chat =  data;
					Tavern.mode = chat[0].mode || "chat";
					Story.showHide();

					chat_create_date = chat[0]["create_date"];
					chat_name = chat[0]["chat_name"];
					winNotes.text = chat[0].notes || "";
					winNotes.strategy = chat[0].notes_type || "discr";
					if (!winNotes.text || !winNotes.text.length) {
						let defaultWpp =
							'[Character("' + Characters.id[Characters.selectedID].name + '"){}]';
						try {
							let parsed = WPP.parse(
								Characters.id[Characters.selectedID].description,
							);
							if (
								parsed[0] &&
								parsed[0].type &&
								parsed[0].type.length &&
								parsed[0].name &&
								parsed[0].name.length
							) {
								defaultWpp = "[" + parsed[0].type + '("' + parsed[0].name + '"){}]';
							}
						} catch (e) {
							/* ignore error */
						}
						winNotes.wppText = defaultWpp;
					}
					chat.shift();
				} else {
					chat_create_date = Date.now();
				}
				getChatResult();
				saveChat();
			},
			error: function (jqXHR, exception) {
				getChatResult();
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	function getChatResult() {
		name2 = Characters.id[Characters.selectedID].name;
		if (chat.length > 1) {
			chat.forEach(function (item, i) {
				if (item["is_user"]) {
					var str = item["mes"].replace(default_user_name + ":", name1 + ":");
					chat[i]["mes"] = str;
					chat[i]["name"] = name1;
				}
			});
		} else if (Tavern.mode === "chat") {
			if (!is_room) {
				let first = Characters.id[Characters.selectedID].first_mes;
				chat[0] = {
					name: name2,
					is_user: false,
					is_name: true,
					send_date: Date.now(),
					mes: first && first.length ? first : default_ch_mes,
				};
			} else {
				Rooms.selectedIDs.forEach(function (curId, i) {
					let first = Characters.id[curId].first_mes;
					chat[i] = {
						name: Characters.id[curId].name,
						is_user: false,
						is_name: true,
						send_date: Date.now(),
						mes: first && first.length ? first : default_ch_mes,
						chid: curId,
					};
				});
			}
		}
		printMessages();
		select_selected_character(Characters.selectedID);
	}

	function loadRoomCharacterSelection() {
		$("#room_character_select_items").empty();
		$("#room_character_selected_items").empty();
		let characterNameList = [];
		Characters.id.forEach(function (character, i) {
			if (!characterNameList.includes(character.name))
				$("#room_character_select_items").append(
					'<div class="avatar" title="' +
						character.name +
						'" ch_name="' +
						character.name +
						'" style="position: relative;">' +
						'<img src="characters/' +
						character.filename +
						'"><img src="../img/cross.png" class="ch_select_cross">' +
						'<input type="hidden" name="room_characters" value="' +
						character.name +
						'" disabled>' +
						"</div>",
				);
			characterNameList.push(character.name);
		});
		$("#room_character_select_items .avatar").on("click", function (event) {
			if (event.currentTarget.parentElement.id == "room_character_select_items")
				// if(!$("#room_character_selected_items .avatar[ch_name='"+event.currentTarget.getAttribute("ch_name")+"']").length)
				// {
				//     $("#room_character_selected_items").append(event.currentTarget);
				// }
				$("#room_character_selected_items").append(event.currentTarget);
			else $("#room_character_select_items").append(event.currentTarget);
			// $("#room_character_selected_items .avatar").on("click", function(event) {
			//     // Don't need if statement since characters won't be in this (#room_character_selected_items) container if they weren't
			//     // picked from the selection container (#room_character_select_items)
			//     // if(!$("#room_character_selected_items .avatar[ch_name='"+event.currentTarget.getAttribute("ch_name")+"']").length)

			//     $("#room_character_select_items").append(event.currentTarget);
			// });
		});
	}

	async function loadRoomSelectedCharacters() {
		$("#room_character_select_items").empty();
		$("#room_character_selected_items").empty();
		Rooms.selectedCharacters.forEach(function (characterId, i) {
			$("#room_character_selected_items").append(
				'<div class="avatar" title="' +
					Characters.id[characterId].name +
					'" ch_name="' +
					Characters.id[characterId].name +
					'" style="position: relative;">' +
					'<img src="characters/' +
					Characters.id[characterId].filename +
					'">' +
					'<img src="../img/cross.png" class="ch_select_cross">' +
					'<input type="hidden" name="character_names" value="' +
					Characters.id[characterId].name +
					'" disabled>' +
					"</div>",
			);
		});
	}

	Characters.id.forEach(function (character, i) {
		if (!Rooms.selectedCharacterNames.includes(character.name))
			$("#room_character_select_items").append(
				'<div class="avatar" title="' +
					character.name +
					'" ch_name="' +
					character.name +
					'" style="position: relative;">' +
					'<img src="characters/' +
					character.filename +
					'"><img src="../img/cross.png" class="ch_select_cross">' +
					'<input type="hidden" name="character_names" value="' +
					character.name +
					'" disabled>' +
					"</div>",
			);
	});

	$("#room_character_selected_items .avatar").on("click", function (event) {
		if (event.currentTarget.parentElement.id == "room_character_select_items") {
			$("#room_character_selected_items").append(event.currentTarget);
		} else {
			if ($("#room_character_selected_items").children().length > 1)
				$("#room_character_select_items").append(event.currentTarget);
			else
				callPopup(
					"Cannot remove character. At least one character needed to be selected.",
					"alert",
				);
		}
	});

	$("#room_character_select_items .avatar").on("click", function (event) {
		if (event.currentTarget.parentElement.id == "room_character_select_items") {
			$("#room_character_selected_items").append(event.currentTarget);
		} else {
			if ($("#room_character_selected_items").children().length > 1)
				$("#room_character_select_items").append(event.currentTarget);
			else
				callPopup(
					"Cannot remove character. At least one character needed to be selected.",
					"alert",
				);
		}
	});

	//menu buttons
	$("#rm_button_characters").children("h2").removeClass("deselected_button_style");
	$("#rm_button_characters").children("h2").addClass("seleced_button_style");
	$("#rm_button_settings").on("click", function () {
		selected_button = "settings";
		menu_type = "settings";

		$("#rm_ch_create_block").css("display", "none");
		$("#rm_info_block").css("display", "none");
		$("#rm_charaters_block").css("display", "none");
		$("#rm_style_block").css("display", "none");

		$("#rm_api_block").css({ display: "grid", opacity: 0 });
		$("#rm_api_block").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {},
		});

		$("#rm_button_settings")
			.children("h2")
			.removeClass("deselected_button_style")
			.addClass("seleced_button_style");

		$("#rm_button_characters")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_style")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");
	});

	$("#rm_button_characters").on("click", function () {
		selected_button = "characters";
		select_rm_characters();
	});

	/*
    $( "#rm_button_back" ).click(function() {
        selected_button = 'characters';
        select_rm_characters();
    });
     */

	$("#rm_button_create").on("click", function () {
		selected_button = "create";
		is_room = false; // Needed to prevent a room being created despite trying to create a character

		select_rm_create();
	});

	$("#rm_button_selected_ch").on("click", function () {
		selected_button = "character_edit";
		select_selected_character(Characters.selectedID);

		if (getIsRoom()) {
			loadRoomSelectedCharacters();
		}
	});

	$("#rm_button_create_room").on("click", function () {
		selected_button = "create_room";
		select_room_create();
	});

	$("#rm_button_style").on("click", function () {
		selected_button = "style";
		select_rm_styles();
	});

	function select_rm_create() {
		// menu buttons
		menu_type = "create";
		$("#rm_charaters_block").css("display", "none");
		$("#rm_api_block").css("display", "none");
		$("#rm_ch_create_block").css("display", "block");
		$("#rm_style_block").css("display", "none");

		$("#rm_ch_create_block").css("opacity", 0.0);
		$("#rm_ch_create_block").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {},
		});
		$("#rm_info_block").css("display", "none");
		$("#result_info").html("&nbsp;");

		$("#rm_button_characters")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_settings")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_style")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$(".chareditor-button-close").css("display", "block");

		$("#character_file_div").css("display", "none");
		// set editor to empty data, create mode
		// is_room = false; // is_room assignment should be handled before the function call
		Characters.editor.chardata = {};
		Characters.editor.editMode = false;
		// if(is_room)
		//     loadRoomCharacterSelection();
		Characters.editor.show();
	}

	function select_room_create() {
		// menu buttons
		menu_type = "create_room";

		$("#rm_info_block").css("display", "none");
		$("#rm_charaters_block").css("display", "none");
		$("#rm_api_block").css("display", "none");
		$("#rm_style_block").css("display", "none");

		$("#rm_ch_create_block").css({ display: "block", opacity: 0 });
		$("#rm_ch_create_block").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {},
		});

		$("#result_info").html("&nbsp;");

		$("#rm_button_characters")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_settings")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_style")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$(".chareditor-button-close").css("display", "block");
		$("#character_file_div").css("display", "none");

		// set editor to empty data, create mode
		is_room = true; // Needed to prevent a character being created despite trying to create a room
		Characters.editor.chardata = {};
		Characters.editor.editMode = false;
		loadRoomCharacterSelection();
		Characters.editor.show();
	}

	function select_rm_characters() {
		menu_type = "characters";

		$("#rm_style_block").css("display", "none");
		$("#rm_api_block").css("display", "none");
		$("#rm_ch_create_block").css("display", "none");
		$("#rm_info_block").css("display", "none");

		$("#rm_charaters_block").css({ display: "block", opacity: 0 });
		$("#rm_charaters_block").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {},
		});

		$("#rm_button_characters")
			.children("h2")
			.removeClass("deselected_button_style")
			.addClass("seleced_button_style");

		$("#rm_button_settings")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_style")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");
	}

	function select_rm_styles() {
		menu_type = "style";

		$("#rm_api_block").css("display", "none");
		$("#rm_ch_create_block").css("display", "none");
		$("#rm_info_block").css("display", "none");
		$("#rm_charaters_block").css("display", "none");

		$("#rm_style_block").css({ display: "flex", opacity: 0 });
		$("#rm_style_block").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {},
		});

		$("#rm_button_style")
			.children("h2")
			.removeClass("deselected_button_style")
			.addClass("seleced_button_style");

		$("#rm_button_settings")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_characters")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");

		$("#rm_ch_create_block")
			.children("h2")
			.removeClass("seleced_button_style")
			.addClass("deselected_button_style");
	}

	$(
		"#input_italic_color, #input_bold_color, #input_title_color, #input_quotes_color, #input_normal_color",
	).on("change", function () {
		const input = $(this);
		const css_variable = input.data("variable");

		user_customization.set(css_variable, input.val());
		document.documentElement.style.setProperty(css_variable, input.val());

		saveColorStylesDebounce();
	});

	function select_selected_character(chid) {
		//character select
		// is_room = false;
		select_rm_create();
		menu_type = "character_edit";

		$("#delete_button_div").css("display", "block");
		$("#rm_button_selected_ch")
			.children("h2")
			.removeClass("deselected_button_style")
			.addClass("seleced_button_style");

		let display_name = "";
		if (!is_room) display_name = Characters.id[chid].name;
		else display_name = "Room: " + Rooms.selectedRoom;

		$("#rm_button_selected_ch").css("display", "inline-block");
		let display_name_text = "";
		for (var i = 0; i < display_name.length; i++) {
			// add a symbol to the h2 element
			display_name_text += display_name[i];
			$("#rm_button_selected_ch").children("h2").text(display_name_text);

			// check if the length exceeds the maximum length
			if ($("#rm_button_selected_ch").children("h2").width() > 136) {
				$("#rm_button_selected_ch")
					.children("h2")
					.text(display_name_text + "...");
				break; // stop adding symbols
			}
		}

		$(".chareditor-button-close").css("display", "none");
		$("#character_file_div").css("display", "block");

		if (Characters.selectedID != undefined) {
			$("#selected_chat_pole").val(Characters.id[Characters.selectedID].chat); // Required so that the characters' chat file path is not updated to an empty string
		}

		// set editor to edit mode
		Characters.editor.chardata = Characters.id[chid];
		Characters.editor.editMode = true;
		Characters.editor.show();
	}

	$("#shell").on("click", ".chat_header_char_info_user_name", function () {
		showCharaCloud();
		showUserProfile($(this).attr("user_name"));
	});

	var scroll_holder = 0;
	var is_use_scroll_holder = false;
	var is_auto_scroll = true;

	$(document).on("input", ".edit_textarea", function () {
		scroll_holder = $("#chat").scrollTop();
		$(this).height(0).height(this.scrollHeight);
		is_use_scroll_holder = true;
	});

	$("#chat").on("scroll", function (e) {
		if (is_use_scroll_holder) {
			$("#chat").scrollTop(scroll_holder);
			is_use_scroll_holder = false;
		}

		is_auto_scroll = e.currentTarget.scrollTop === e.currentTarget.scrollTopMax;
	});

	$(document).on("click", ".del_checkbox", function () {
		$(".del_checkbox").each(function () {
			$(this).prop("checked", false);
			$(this).parent().css("background", css_mes_bg);
		});

		$(this).parent().css("background", "#791b31");
		var i = $(this).parent().attr("mesid");
		this_del_mes = i;
		while (i < chat.length) {
			$(".mes[mesid='" + i + "']").css("background", "#791b31");
			$(".mes[mesid='" + i + "']")
				.children(".del_checkbox")
				.prop("checked", true);
			i++;
			//console.log(i);
		}
	});

	$(document).on("click", "#user_avatar_block .avatar", function () {
		user_avatar = $(this).attr("imgfile");
		$(".mes").each(function () {
			if ($(this).attr("ch_name") == name1) {
				$(this)
					.children(".avatar")
					.children("img")
					.attr("src", "User Avatars/" + user_avatar);
			}
		});
		saveSettings();
	});

	$("#logo_block").on("click", function (event) {
		if (!bg_menu_toggle) {
			if (is_mobile_user) {
				$("#chara_cloud").transition({
					paddingLeft: "10px",
					duration: 300,
					easing: "",
					complete: function () {},
				});
			} else {
				$("#chara_cloud").transition({
					paddingLeft: "11rem",
					duration: 300,
					easing: "",
					complete: function () {},
				});
			}

			$("#style_menu").css({ display: "block" });
			templates.forEach(function (item, i) {
				$("#style_button" + i).css("opacity", 0.0);
				$("#style_button" + i).transition({ y: "-10px", opacity: 0.0, duration: 0 });
				setTimeout(() => {
					$("#style_button" + i).transition({ y: "0px", opacity: 1.0, duration: 200 });
				}, (templates.length - i) * 100);
			});
			$("#bg_menu_button").transition({ perspective: "100px", rotate3d: "1,1,0,180deg" });
			//$('#bg_menu_content1').css('display', 'block');
			//$('#bg_menu_content1').css('opticary', 0);marginTop: '10px'
			$("#bg_menu_content").transition({
				opacity: 1.0,
				height: "calc(100vh - 46px)",
				duration: 340,
				easing: "in",
				complete: function () {
					bg_menu_toggle = true;
					$("#bg_menu_content").css("overflow-y", "auto");
				},
			});
		} else {
			if (is_mobile_user) {
				$("#chara_cloud").transition({
					paddingLeft: "10px",
					duration: 300,
					easing: "",
					complete: function () {},
				});
			} else {
				$("#chara_cloud").transition({
					paddingLeft: "5rem",
					duration: 300,
					easing: "",
					complete: function () {},
				});
			}

			templates.forEach(function (item, i) {
				setTimeout(() => {
					$("#style_button" + i).transition({ y: "-15px", opacity: 0.0, duration: 100 });
				}, i * 20);
			});
			$("#style_menu").css({ display: "none" });

			$("#bg_menu_button").transition({ perspective: "100px", rotate3d: "1,1,0,360deg" });
			$("#bg_menu_content").css("overflow-y", "hidden");
			$("#bg_menu_content").transition({
				opacity: 0.0,
				height: "0px",
				duration: 340,
				easing: "in",
				complete: function () {
					bg_menu_toggle = false;
				},
			});
		}
	});

	$(document).on("click", ".bg_example_img", function () {
		var this_bgfile = $(this).attr("bgfile");

		if (bg1_toggle == true) {
			bg1_toggle = false;
			number_bg = 2;
			var target_opacity = 1.0;
		} else {
			bg1_toggle = true;
			number_bg = 1;
			var target_opacity = 0.0;
		}
		$("#bg2").stop();
		$("#bg2").transition({
			opacity: target_opacity,
			duration: 500, //animation_rm_duration,
			easing: "linear",
			complete: function () {
				$("#options").css("display", "none");
			},
		});

		let this_bg_style = $("body").css("background-image");
		if (this_bg_style.includes("url(")) {
			this_bg_style = this_bg_style.replace(
				/url\(['"]?([^'"]*)['"]?\)/i,
				'url("../backgrounds/' + this_bgfile + '")',
			);
			$("#bg" + number_bg).css("background-image", this_bg_style);
			$("body").css("background-image", this_bg_style);
			setBackground(this_bg_style);
		}
	});

	$(document).on("click", ".bg_example_cross", function () {
		bg_file_for_del = $(this);
		//$(this).parent().remove();
		//delBackground(this_bgfile);
		callPopup("<h3>Delete the background?</h3>", "del_bg");
	});

	$(document).on("click", ".style_button", function () {
		const this_style_id = $(this).attr("style_id");
		const this_style_name = templates[this_style_id];
		//
		//console.log('old '+$('#chat')[0].scrollHeight); //$textchat.scrollTop($textchat[0].scrollHeight
		let oldScrollTop = $("#chat").scrollTop();
		let oldHeight = $("#chat")[0].scrollHeight - $("#chat").height();

		let oldProportion = oldScrollTop / oldHeight;
		$("#base_theme").attr("href", "templates/classic.css");
		$("#send_textarea").attr("style", "");
		if (this_style_name === "classic.css") {
			// Remove the existing theme link element if it exists
			$("#theme").remove();
		} else {
			// Create or update the theme link element with the new style
			let cssLink = $("#theme");
			if (!cssLink.length) {
				cssLink = $('<link id="theme" rel="stylesheet" type="text/css">');
				$("head").append(cssLink);
			}
			cssLink.attr("href", "templates/" + this_style_name);
		}

		let newHeight = $("#chat")[0].scrollHeight - $("#chat").height();
		$("#chat").scrollTop(oldProportion * newHeight);

		const request = { style: this_style_name };
		jQuery.ajax({
			method: "POST",
			url: "/savestyle",
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			data: JSON.stringify(request),
			success: function (response) {
				setTimeout(() => {
					let this_bg_style = $("body").css("background-image");
					if (this_bg_style.includes("url(")) {
						$("#bg1").css("display", "block");
						$("#bg2").css("display", "block");
						this_bg_style = this_bg_style.replace(
							/url\(['"]?([^'"]*)['"]?\)/i,
							'url("../backgrounds/tavern.png")',
						);
						$("#bg").css("background-image", this_bg_style);
					} else {
						this_bg_style = "none";
						$("#bg1").css("display", "none");
						$("#bg2").css("display", "none");
					}
					setBackground(this_bg_style);
				}, 200);
			},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
			},
		});
	});

	$("#character_advanced_button").on("click", function () {
		if (!is_advanced_char_open) {
			is_advanced_char_open = true;
			if (is_master_settings_open) {
				$("#master_settings_cross").trigger("click");

				$("#character_popup").css("opacity", 1.0);
				$("#character_popup").css("display", "grid");
			} else {
				$("#character_popup").css("display", "grid");
				$("#character_popup").css("opacity", 0.0);
				$("#character_popup").transition({
					opacity: 1.0,
					duration: animation_rm_duration,
					easing: animation_rm_easing,
				});
			}
		} else {
			$("#character_cross").trigger("click");
		}
	});

	$("#master_settings_button").on("click", function () {
		if (!is_master_settings_open) {
			is_master_settings_open = true;

			if (is_advanced_char_open) {
				$("#character_cross").trigger("click");
			}

			$("#master_settings_popup").css({ display: "grid", opacity: 1 });
			MasterSettings.ResizeAllTextArea();

			$("#master_settings_popup .container").css("opacity", 0).transition({
				opacity: 1.0,
				duration: animation_rm_duration,
				easing: animation_rm_easing,
			});
		} else {
			$("#master_settings_cross").trigger("click");
		}
	});

	$("#character_cross").on("click", function () {
		is_advanced_char_open = false;
		if (!is_master_settings_open) {
			$("#character_popup").transition({
				opacity: 0.0,
				duration: animation_rm_duration,
				easing: animation_rm_easing,
				complete: function () {
					$("#character_popup").css("display", "none");
				},
			});
		} else {
			$("#character_popup").css("display", "none");
		}
	});

	$("#character_popup_ok").on("click", function () {
		$("#character_cross").trigger("click");
	});

	$("#master_settings_cross").on("click", function () {
		is_master_settings_open = false;

		$("#master_settings_popup .container").transition({
			opacity: 0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {
				$("#master_settings_popup").css({ display: "none", opacity: 0 });
			},
		});
	});

	$("#dialogue_popup_ok").on("click", function () {
		$("#shadow_popup").css("display", "none");
		$("#shadow_popup").css("opacity:", 0.0);

		if (popup_type == "del_bg") {
			delBackground(bg_file_for_del.attr("bgfile"));
			bg_file_for_del.parent().remove();
			return;
		}

		if (popup_type == "del_ch") {
			Characters.deleteCharacter(Characters.id[Characters.selectedID].filename);
			return;
		}

		if (popup_type == "del_ch_characloud") {
			charaCloud
				.deleteCharacter(
					charaCloud.delete_character_user_name,
					charaCloud.delete_character_public_id_short,
				)
				.then(function (data) {
					$(
						`div.characloud_character_block[public_id_short="${charaCloud.delete_character_public_id_short}"]`,
					).remove();
				})
				.catch(function (error) {
					console.log(error);
					switch (error.status) {
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				});
			return;
		}

		if (popup_type == "del_ch_characloud_from_edit_moderation") {
			charaCloud
				.deleteCharacter(
					charaCloud.delete_character_user_name,
					charaCloud.delete_character_public_id_short,
					"moderation_edit",
				)
				.then(function (data) {
					$(
						`div.characloud_character_block[public_id_short="${charaCloud.delete_character_public_id_short}"]`,
					).remove();
				})
				.catch(function (error) {
					console.log(error);
					switch (error.status) {
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				});
			return;
		}

		if (popup_type === "delete_user_avatar") {
			jQuery.ajax({
				type: "POST", //
				url: `deleteuseravatar`, //
				data: JSON.stringify({
					filename: delete_user_avatar_filename,
				}),
				beforeSend: function () {
					//$('.load_icon').children('.load_icon').css('display', 'inline-block');
					//$('.publish_button').children('.submit_button').css('display', 'none');
				},
				cache: false,
				dataType: "json",
				contentType: "application/json",
				processData: false,
				success: function (data) {
					getUserAvatars();
				},
				error: function (jqXHR, exception) {
					let error = handleError(jqXHR);
					callPopup(error.msg, "alert_error");
				},
				complete: function (data) {
					//$('.load_icon').children('.load_icon').css('display', 'inline-block');
					//$('.publish_button').children('.submit_button').css('display', 'none');
				},
			});
		}

		if (popup_type === "convert_to_story") {
			Story.ConvertChatStory();
			return;
		}

		if (
			popup_type == "new_chat" &&
			Characters.selectedID != undefined &&
			menu_type != "create"
		) {
			// Fix it; New chat doesn't create while open create character menu
			Tavern.mode = "chat";
			Story.showHide();

			clearChat();
			chat.length = 0;
			Characters.id[Characters.selectedID].chat = Date.now();
			$("#selected_chat_pole").val(Characters.id[Characters.selectedID].chat);
			timerSaveEdit = setTimeout(() => {
				$("#create_button").trigger("click");
			}, durationSaveEdit);
			getChat();
			return;
		}

		if (popup_type === "logout") {
			charaCloud
				.logout()
				.then(function (data) {
					login = undefined;
					ALPHA_KEY = undefined;
					deleteCookie("login_view");
					deleteCookie("login");
					deleteCookie("ALPHA_KEY");

					$(".characloud_content").css("display", "none");
					$("#characloud_user_profile_block").css("display", "none");
					$("#characloud_characters").css("display", "block");
					$("#characloud_board").css("display", "block");
					$("#profile_button_is_not_login").css("display", "block");
					$("#profile_button_is_login").css("display", "none");
					is_login = false;
					return;
				})
				.catch(function (error) {
					callPopup(`Logout error`, "alert_error");
					return;
				});
		}

		if (popup_type === "delete_chat") {
			jQuery.ajax({
				type: "POST", //
				url: "/deletechat", //
				data: JSON.stringify(data_delete_chat),
				beforeSend: function () {
					//$('#create_button').attr('value','Creating...');
				},
				cache: false,
				timeout: requestTimeout,
				dataType: "json",
				contentType: "application/json",
				success: function (data) {
					$(
						'div.select_chat_block[file_name="' + data_delete_chat.chat_file + '"]',
					).remove();
				},
				error: function (jqXHR, exception) {
					console.log(exception);
					console.log(jqXHR);
					callPopup(exception, "alert_error");
				},
			});
		}

		if (popup_type === "add_openai_perset") {
			const perset_name = $("#dialogue_popup_input").val();

			fetch("/add_openai_perset", {
				method: "POST",
				body: JSON.stringify({ perset_name }),
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": token,
				},
			})
				.then(async (res) => {
					const data = await res.json();
					if (res.status <= 299) {
						const perset_parent = $("#settings_perset_openai");
						await getAllOpenAIPersetSettings();

						perset_parent.empty();
						for (let [key, value] of Object.entries(persets_setting_names)) {
							perset_parent.append(`<option value=${value}>${key}</option>`);
						}
						perset_parent.find(":selected").prop("selected", false);

						if (main_api === "openai") {
							perset_settings_openai = perset_name;
							$(
								`#settings_perset_openai option[value="${persets_setting_names[perset_settings_openai]}"]`,
							).prop("selected", true);
						}

						if (main_api === "proxy") {
							perset_settings_proxy = perset_name;
							$(
								`#settings_perset_openai option[value="${persets_setting_names[perset_settings_proxy]}"]`,
							).prop("selected", true);
						}

						perset_parent.trigger("change");
					} else {
						throw new Error(data.error);
					}
				})
				.catch((err) => {
					console.error(err);
				});
		}

		if (popup_type === "edit_openai_perset") {
			const new_name = $("#dialogue_popup_input").val();
			const old_name = main_api === "openai" ? perset_settings_openai : perset_settings_proxy;

			fetch("/edit_openai_perset", {
				method: "POST",
				body: JSON.stringify({ perset_name: old_name, new_name }),
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": token,
				},
			})
				.then(async (res) => {
					const data = await res.json();
					if (res.status <= 299) {
						// TODO: Update current perset name
						$("#settings_perset_openai")
							.find(`*:contains("${old_name}")`)
							.text(new_name);

						persets_setting_names = {
							...persets_setting_names,
							[new_name]: persets_setting_names[old_name],
						};
						delete persets_setting_names[old_name];

						if (main_api === "openai") {
							perset_settings_openai = new_name;
						}

						if (main_api === "proxy") {
							perset_settings_proxy = new_name;
						}

						saveSettingsDebounce();
					} else {
						throw new Error(data.error);
					}
				})
				.catch((err) => {
					console.error(err);
				});
		}

		if (popup_type === "delete_openai_perset") {
			fetch("/delete_openai_perset", {
				method: "POST",
				body: JSON.stringify({
					perset_name:
						main_api === "openai" ? perset_settings_openai : perset_settings_proxy,
				}),
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": token,
				},
			})
				.then(async (res) => {
					const data = await res.json();
					if (res.status <= 299) {
						const perset_parent = $("#settings_perset_openai");

						// Delete perset
						perset_parent.find(":selected").remove();

						// Set perset to default
						perset_parent.find(`*:contains("Default")`).prop("selected", true);
						perset_parent.trigger("change");
					} else {
						throw new Error(data.error);
					}
				})
				.catch((err) => {
					console.error(err);
				});
		}
	});

	$("#dialogue_popup_cancel").on("click", function () {
		$("#shadow_popup").css("display", "none");
		$("#shadow_popup").css("opacity:", 0.0);
		popup_type = "";
	});

	function callPopup(text = "", type) {
		popup_type = type;
		$("#dialogue_popup_cancel").css("display", "inline-block");
		$("#dialogue_popup_input_container").css("display", "none");

		switch (popup_type) {
			case "logout":
				$("#dialogue_popup_ok").css("background-color", "#191b31CC");
				$("#dialogue_popup_ok").text("Yes");
				$("#dialogue_popup_text").html("<h3>Log out of account?</h3>");
				break;

			case "alert":
				$("#dialogue_popup_ok").css("background-color", "#191b31CC");
				$("#dialogue_popup_ok").text("Ok");
				$("#dialogue_popup_cancel").css("display", "none");
				text = `<h3 class="alert">${text}</h3>`;
				break;

			case "alert_error":
				text = `<p>${text}</p>`;
				$("#dialogue_popup_ok").css("background-color", "#191b31CC");
				$("#dialogue_popup_ok").text("Ok");
				$("#dialogue_popup_cancel").css("display", "none");
				text = '<h3 class="error">Error</h3>' + text + "";
				break;

			case "new_chat":
				$("#dialogue_popup_ok").css("background-color", "#191b31CC");
				$("#dialogue_popup_ok").text("Yes");
				break;

			case "convert_to_story":
				$("#dialogue_popup_ok").css("background-color", "#191b31CC");
				$("#dialogue_popup_ok").text("Yes");
				break;

			default:
				if (/^(add|edit)/.test(popup_type)) {
					$("#dialogue_popup_input_container").css("display", "flex");

					if (popup_type.startsWith("add")) {
						$("#dialogue_popup_input").val("");
					}

					if (popup_type.startsWith("edit")) {
						$("#dialogue_popup_input").val(
							main_api === "openai" ? perset_settings_openai : perset_settings_proxy,
						);
					}

					$("#dialogue_popup_ok").css("background-color", "#16a34a");
					$("#dialogue_popup_ok").text(popup_type.split("_")[0]);
				} else {
					$("#dialogue_popup_ok").css("background-color", "#791b31");
					$("#dialogue_popup_ok").text("Delete");
				}
		}
		if (text !== "") {
			$("#dialogue_popup_text").html(text);
		}
		$("#shadow_popup").css("display", "block");
		$("#shadow_popup").transition({
			opacity: 1.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
		});
	}

	function read_bg_load(input) {
		if (input.files && input.files[0]) {
			var reader = new FileReader();

			reader.onload = function (e) {
				$("#bg_load_preview").attr("src", e.target.result).width(103).height(83);

				var formData = new FormData($("#form_bg_download").get(0));

				//console.log(formData);
				jQuery.ajax({
					type: "POST",
					url: "/downloadbackground",
					data: formData,
					beforeSend: function () {
						//$('#create_button').attr('value','Creating...');
					},
					cache: false,
					timeout: requestTimeout,
					contentType: false,
					processData: false,
					success: function (html) {
						let this_bg_style = $("body").css("background-image");
						if (this_bg_style.includes("url(")) {
							this_bg_style = this_bg_style.replace(
								/url\(['"]?([^'"]*)['"]?\)/i,
								'url("../backgrounds/' + html + '")',
							);
							$("#bg" + number_bg).css("background-image", this_bg_style);
							setBackground(this_bg_style);
						}
						if (bg1_toggle == true) {
							bg1_toggle = false;
							number_bg = 2;
							var target_opacity = 1.0;
						} else {
							bg1_toggle = true;
							number_bg = 1;
							var target_opacity = 0.0;
						}
						$("#bg2").transition({
							opacity: target_opacity,
							duration: 1300, //animation_rm_duration,
							easing: "linear",
							complete: function () {
								$("#options").css("display", "none");
							},
						});
						this_bg_style = $("body").css("background-image");
						if (this_bg_style.includes("url(")) {
							$("#bg" + number_bg).css(
								"background-image",
								this_bg_style.replace(
									/url\(['"]?([^'"]*)['"]?\)/i,
									'url("' + e.target.result + '")',
								),
							);
						}
						//$('#bg'+number_bg).css('background-image', 'linear-gradient(rgba(19,21,44,0.75), rgba(19,21,44,0.75)), url('+e.target.result+')');
						$("#form_bg_download").after(
							"<div class=bg_example><img bgfile='" +
								html +
								"' class=bg_example_img src='backgrounds/" +
								html +
								"'><img bgfile='" +
								html +
								"' class=bg_example_cross src=img/cross.png></div>",
						);
					},
					error: function (jqXHR, exception) {
						console.log(exception);
						console.log(jqXHR);
					},
				});
			};

			reader.readAsDataURL(input.files[0]);
		}
	}
	$("#add_bg_button").on("change", function () {
		read_bg_load(this);
	});
	$("#rm_info_button").on("click", function () {
		$("#rm_info_avatar").html("");
		select_rm_characters();
	});
	//@@@@@@@@@@@@@@@@@@@@@@@@
	//character text poles creating and editing save
	$("#api_button").on("click", function () {
		if ($("#api_url_text").val() != "") {
			$("#api_loading").css("display", "inline-block");
			$("#api_button").css("display", "none");
			api_server = $("#api_url_text").val();
			api_server = $.trim(api_server);
			//console.log("1: "+api_server);
			if (api_server.substr(api_server.length - 1, 1) == "/") {
				api_server = api_server.substr(0, api_server.length - 1);
			}
			if (
				!(
					api_server.substr(api_server.length - 3, 3) == "api" ||
					api_server.substr(api_server.length - 4, 4) == "api/"
				)
			) {
				api_server = api_server + "/api";
			}
			//console.log("2: "+api_server);
			saveSettings();
			is_get_status = true;
			is_api_button_press = true;
			getStatus();
		}
	});

	// HORDE
	$("#api_button_horde").on("click", function () {
		if ($("#horde_api_key").val() != "") {
			horde_api_key == "0000000000";
		}
		$("#api_loading_horde").css("display", "inline-block");
		$("#api_button_horde").css("display", "none");
		is_get_status = true;
		is_api_button_press = true;
		getStatusHorde();
	});

	$("body").on("click", function () {
		if ($("#options").css("opacity") == 1.0) {
			$("#options").transition({
				opacity: 0.0,
				duration: 100, //animation_rm_duration,
				easing: animation_rm_easing,
				complete: function () {
					$("#options").css("display", "none");
				},
			});
		}
	});

	$("#options_button").on("click", function () {
		if ($("#options").css("display") === "none" && $("#options").css("opacity") == 0.0) {
			$("#options").css("display", "block");
			$("#options").transition({
				opacity: 1.0,
				duration: 100,
				easing: animation_rm_easing,
				complete: function () {},
			});
		}
	});

	$("#option_start_new_chat").on("click", function () {
		if (Characters.selectedID != undefined && !Tavern.is_send_press) {
			callPopup("<h3>Start new chat?</h3>", "new_chat");
		}
	});

	$("#option_select_chat").on("click", function () {
		if (Characters.selectedID != undefined && !Tavern.is_send_press) {
			getAllCharaChats();
			$("#shadow_select_chat_popup").css("display", "block");
			$("#shadow_select_chat_popup").css("opacity", 0.0);
			$("#shadow_select_chat_popup").transition({
				opacity: 1.0,
				duration: animation_rm_duration,
				easing: animation_rm_easing,
			});
		}
	});

	$("#option_impersonate").on("click", function () {
		if (Tavern.is_send_press == false) {
			$("#send_textarea").val("").trigger("input");

			hideSwipeButtons();
			Tavern.is_send_press = true;

			Generate("impersonate");
		}
	});

	$("#option_delete_mes").on("click", function () {
		if (Characters.selectedID != undefined && !Tavern.is_send_press) {
			hideSwipeButtons();

			// Hide edit message button.
			$("#chat")
				.children()
				.each(function () {
					$(this).children(".mes_btn_group").css({ display: "none" });
				});

			$("#dialogue_del_mes").css("display", "flex");
			$("#send_form").css("display", "none");
			$(".del_checkbox").each(function () {
				if ($(this).parent().attr("mesid") != 0) {
					$(this).css("display", "block");
					$(this).parent().children(".for_checkbox").css("display", "none");
				}
			});

			$("#chat")
				.children()
				.each(function () {
					const mes_id = $(this).attr("mesid");
					if (parseInt(mes_id) === 0) return;

					$(this).off("click");
					$(this).on("click", () => {
						$(".del_checkbox").each(function () {
							$(this).prop("checked", false);
							$(this).parent().css("background", css_mes_bg);
						});

						$(this).css("background", "#791b31");

						let i = $(this).attr("mesid");

						this_del_mes = i;
						while (i < chat.length) {
							$(".mes[mesid='" + i + "']").css("background", "#791b31");
							$(".mes[mesid='" + i + "']")
								.children(".del_checkbox")
								.prop("checked", true);
							i++;
						}
					});
				});
		}
	});

	$("#option_regenerate").on("click", function () {
		if (Tavern.mode === "chat") {
			if (Tavern.is_send_press == false && count_view_mes > 1) {
				hideSwipeButtons();
				Tavern.is_send_press = true;
				if (this_edit_mes_id === chat.length - 1) {
					this_edit_target_id = undefined;
					this_edit_mes_id = undefined;
				}
				Generate("regenerate");
			}
			return;
		}
		if (Tavern.mode === "story") {
			if (Tavern.is_send_press == false) {
				Story.Generate();
			}
		}
	});

	$("#dialogue_del_mes_cancel").on("click", function () {
		showSwipeButtons();

		// Show edit message button.
		$("#chat")
			.children()
			.each(function () {
				$(this).children(".mes_btn_group").css({ display: "flex" });
			});

		$("#dialogue_del_mes").css("display", "none");
		$("#send_form").css("display", css_send_form_display);
		$(".del_checkbox").each(function () {
			$(this).css("display", "none");
			$(this).parent().children(".for_checkbox").css("display", "block");
			$(this).parent().css("background", css_mes_bg);
			$(this).prop("checked", false);
		});

		this_del_mes = 0;

		$("#chat")
			.children()
			.each(function () {
				$(this).off("click");
			});
	});

	$("#dialogue_del_mes_ok").on("click", function () {
		$("#dialogue_del_mes").css("display", "none");
		$("#send_form").css("display", css_send_form_display);

		// Show edit message button.
		$("#chat")
			.children()
			.each(function () {
				$(this).children(".mes_btn_group").css({ display: "flex" });
			});

		$(".del_checkbox").each(function () {
			$(this).css("display", "none");
			$(this).parent().children(".for_checkbox").css("display", "block");
			$(this).parent().css("background", css_mes_bg);
			$(this).prop("checked", false);
		});

		if (this_del_mes != 0) {
			$(`.mes[mesid="${this_del_mes}"]`).nextAll("div").remove();
			$(`.mes[mesid="${this_del_mes}"]`).remove();

			chat.length = this_del_mes;
			count_view_mes = this_del_mes;

			if (!is_room) {
				saveChat();
			} else {
				Rooms.setActiveCharacterId(chat);
				saveChatRoom();
			}

			var $textchat = $("#chat");
			$textchat[0].scrollTo({ top: $textchat[0].scrollHeight, behavior: "smooth" });
		}

		showSwipeButtons();
		this_del_mes = 0;

		$("#chat")
			.children()
			.each(function () {
				$(this).off("click");
			});
	});

	function showSwipeButtons() {
		if (swipes) {
			if (!chat[chat.length - 1]["is_user"] && count_view_mes > 1) {
				$("#chat")
					.children()
					.filter('[mesid="' + (count_view_mes - 1) + '"]')
					.children(".swipe_right")
					.css("display", "block");

				if (chat[chat.length - 1]["swipe_id"] !== undefined) {
					if (chat[chat.length - 1]["swipe_id"] != 0) {
						$("#chat")
							.children()
							.filter('[mesid="' + (count_view_mes - 1) + '"]')
							.children(".swipe_left")
							.css("display", "block");
					}
				}
			}
		}
	}

	function hideSwipeButtons() {
		const current_mes = $("#chat")
			.children()
			.filter('[mesid="' + (count_view_mes - 1) + '"]');

		current_mes.children(".swipe_right").css("display", "none");
		current_mes.children(".swipe_left").css("display", "none");
	}

	$("#settings_perset").on("change", function () {
		if ($("#settings_perset").find(":selected").val() != "gui") {
			preset_settings = $("#settings_perset").find(":selected").text();
			temp = koboldai_settings[koboldai_setting_names[preset_settings]].temp;

			top_p = koboldai_settings[koboldai_setting_names[preset_settings]].top_p;
			top_k = koboldai_settings[koboldai_setting_names[preset_settings]].top_k;
			top_a = koboldai_settings[koboldai_setting_names[preset_settings]].top_a;
			typical = koboldai_settings[koboldai_setting_names[preset_settings]].typical;
			tfs = koboldai_settings[koboldai_setting_names[preset_settings]].tfs;

			amount_gen = koboldai_settings[koboldai_setting_names[preset_settings]].genamt;
			rep_pen = koboldai_settings[koboldai_setting_names[preset_settings]].rep_pen;
			rep_pen_size = koboldai_settings[koboldai_setting_names[preset_settings]].rep_pen_range;
			rep_pen_slope =
				koboldai_settings[koboldai_setting_names[preset_settings]].rep_pen_slope;
			if (!lock_context_size) {
				max_context = koboldai_settings[koboldai_setting_names[preset_settings]].max_length;
			}
			$("#temp").val(temp);
			$("#temp_counter").html(temp);

			$("#amount_gen").val(amount_gen);
			$("#amount_gen_counter").html(amount_gen);

			$("#max_context").val(max_context);
			$("#max_context_counter").html(max_context + " Tokens");

			$("#top_p").val(top_p);
			$("#top_p_counter").html(top_p);

			$("#top_k").val(top_k);
			$("#top_k_counter").html(top_k);

			$("#top_a").val(top_a);
			$("#top_a_counter").html(top_a);

			$("#typical").val(typical);
			$("#typical_counter").html(typical);

			$("#tfs").val(tfs);
			$("#tfs_counter").html(tfs);

			$("#rep_pen").val(rep_pen);
			$("#rep_pen_counter").html(rep_pen);

			$("#rep_pen_size").val(rep_pen_size);
			$("#rep_pen_size_counter").html(rep_pen_size + " Tokens");

			$("#rep_pen_slope").val(rep_pen_slope);
			$("#rep_pen_slope_counter").html(rep_pen_slope);

			$("#range_block").children().prop("disabled", false);
			$("#range_block").css("opacity", 1.0);
			$("#amount_gen_block").children().prop("disabled", false);
			$("#amount_gen_block").css("opacity", 1.0);

			$("#top_p_block").children().prop("disabled", false);
			$("#top_p_block").css("opacity", 1.0);

			$("#top_k_block").children().prop("disabled", false);
			$("#top_k_block").css("opacity", 1.0);

			$("#top_a_block").children().prop("disabled", false);
			$("#top_a_block").css("opacity", 1.0);

			$("#typical_block").children().prop("disabled", false);
			$("#typical_block").css("opacity", 1.0);

			$("#tfs_block").children().prop("disabled", false);
			$("#tfs_block").css("opacity", 1.0);

			$("#rep_pen_size_block").children().prop("disabled", false);
			$("#rep_pen_size_block").css("opacity", 1.0);

			$("#rep_pen_slope_block").children().prop("disabled", false);
			$("#rep_pen_slope_block").css("opacity", 1.0);
		} else {
			//$('.button').disableSelection();
			preset_settings = "gui";
			$("#range_block").children().prop("disabled", true);
			$("#range_block").css("opacity", 0.5);
			$("#top_p_block").children().prop("disabled", true);
			$("#top_p_block").css("opacity", 0.45);

			$("#top_k_block").children().prop("disabled", true);
			$("#top_k_block").css("opacity", 0.45);

			$("#top_a_block").children().prop("disabled", true);
			$("#top_a_block").css("opacity", 0.45);

			$("#typical_block").children().prop("disabled", true);
			$("#typical_block").css("opacity", 0.45);

			$("#tfs_block").children().prop("disabled", true);
			$("#tfs_block").css("opacity", 0.45);

			$("#rep_pen_size_block").children().prop("disabled", true);
			$("#rep_pen_size_block").css("opacity", 0.45);

			$("#rep_pen_slope_block").children().prop("disabled", true);
			$("#rep_pen_slope_block").css("opacity", 0.45);
			$("#amount_gen_block").children().prop("disabled", true);
			$("#amount_gen_block").css("opacity", 0.45);
		}
		saveSettingsDebounce();
	});

	$("#settings_perset_novel").on("change", function () {
		preset_settings_novel = $("#settings_perset_novel").find(":selected").text();

		temp_novel = novelai_settings[novelai_setting_names[preset_settings_novel]].temperature;
		top_p_novel = novelai_settings[novelai_setting_names[preset_settings_novel]].top_p;
		top_k_novel = novelai_settings[novelai_setting_names[preset_settings_novel]].top_k;
		top_a_novel = novelai_settings[novelai_setting_names[preset_settings_novel]].top_a;
		typical_novel = novelai_settings[novelai_setting_names[preset_settings_novel]].typical_p;

		tfs_novel =
			novelai_settings[novelai_setting_names[preset_settings_novel]].tail_free_sampling;
		amount_gen_novel =
			novelai_settings[novelai_setting_names[preset_settings_novel]].max_length;
		rep_pen_novel =
			novelai_settings[novelai_setting_names[preset_settings_novel]].repetition_penalty;
		rep_pen_size_novel =
			novelai_settings[novelai_setting_names[preset_settings_novel]].repetition_penalty_range;
		rep_pen_slope_novel =
			novelai_settings[novelai_setting_names[preset_settings_novel]].repetition_penalty_slope;

		$("#temp_novel").val(temp_novel);
		$("#temp_counter_novel").html(temp_novel);

		$("#amount_gen_novel").val(amount_gen_novel);
		$("#amount_gen_counter_novel").html(amount_gen_novel);

		$("#top_p_novel").val(top_p_novel);
		$("#top_p_counter_novel").html(top_p_novel);

		$("#top_k_novel").val(top_k_novel);
		$("#top_k_counter_novel").html(top_k_novel);

		$("#top_a_novel").val(top_a_novel);
		$("#top_a_counter_novel").html(top_a_novel);

		$("#typical_novel").val(typical_novel);
		$("#typical_counter_novel").html(typical_novel);

		$("#tfs_novel").val(tfs_novel);
		$("#tfs_counter_novel").html(tfs_novel);

		$("#rep_pen_novel").val(rep_pen_novel);
		$("#rep_pen_counter_novel").html(rep_pen_novel);

		$("#rep_pen_size_novel").val(rep_pen_size_novel);
		$("#rep_pen_size_counter_novel").html(rep_pen_size_novel + " Tokens");

		$("#rep_pen_slope_novel").val(rep_pen_slope_novel);
		$("#rep_pen_slope_counter_novel").html(rep_pen_slope_novel);

		//$("#range_block").children().prop("disabled", false);
		//$("#range_block").css('opacity',1.0);
		saveSettingsDebounce();
	});

	$("#settings_perset_openai").on("change", async () => {
		if (main_api === "openai") {
			perset_settings_openai = $("#settings_perset_openai").find(":selected").text();
			await getOpenAIPersetSettings(perset_settings_openai);

			let current_perset = persets_settings[persets_setting_names[perset_settings_openai]];
			setOpenAISettings({}, current_perset);

			SystemPrompt.selectWithLoad(
				current_perset.system_prompt_preset_chat || SystemPrompt.empty_prest_id,
			);
		}

		if (main_api === "proxy") {
			perset_settings_proxy = $("#settings_perset_openai").find(":selected").text();
			await getOpenAIPersetSettings(perset_settings_proxy);

			let current_perset = persets_settings[persets_setting_names[perset_settings_proxy]];
			setProxySettings({}, current_perset);

			SystemPrompt.selectWithLoad(
				current_perset.system_prompt_preset_chat || SystemPrompt.empty_prest_id,
			);

			is_need_load_models_proxy = true;
		}

		openAIChangeMaxContextForModels();
		saveSettingsDebounce();

		online_status = "no_connection";
		checkOnlineStatus();

		if (main_api === "openai" || (main_api === "proxy" && api_url_proxy)) {
			$("#api_button_openai").trigger("click");
		}
	});

	$("#openai_perset_add").on("click", () =>
		callPopup(`<h3>Add perset</h3>`, "add_openai_perset"),
	);

	$("#openai_perset_edit").on("click", () => {
		const perset_name = main_api === "openai" ? perset_settings_openai : perset_settings_proxy;
		callPopup(`<h3>Edit perset ${perset_name} </h3>`, "edit_openai_perset");
	});

	$("#openai_perset_delete").on("click", () => {
		const perset_name = main_api === "openai" ? perset_settings_openai : perset_settings_proxy;
		callPopup(`<h3>Delete perset '${perset_name}'? </h3>`, "delete_openai_perset");
	});

	$("#main_api").on("change", function () {
		is_pygmalion = false;
		is_get_status = false;
		is_get_status_novel = false;
		is_get_status_openai = false;
		online_status = "no_connection";

		checkOnlineStatus();
		changeMainAPI();
		saveSettings();

		// HORDE
		horde_model = "";
		$("#horde_model_select").empty();
		$("#horde_model_select").append(
			$("<option></option>").val("").html("-- Connect to Horde for models --"),
		);
	});

	function changeMainAPI() {
		if ($("#main_api").find(":selected").val() == "kobold") {
			$("#kobold_api").css("display", "block");
			$("#novel_api").css("display", "none");
			$("#openai_api").css("display", "none");
			$("#horde_api").css("display", "none");
			document.getElementById("hordeInfo").classList.add("hidden");

			if (!is_mobile_user) {
				$("#master_settings_koboldai_block").css("display", "grid");
			}
			$("#master_settings_novelai_block").css("display", "none");
			$("#master_settings_openai_block").css("display", "none");
			$("#singleline_toggle").css("display", "grid");
			$("#multigen_toggle").css("display", "grid");

			main_api = "kobold";
		}

		// NovelAI
		if ($("#main_api").find(":selected").val() == "novel") {
			$("#kobold_api").css("display", "none");
			$("#novel_api").css("display", "block");
			$("#openai_api").css("display", "none");
			$("#horde_api").css("display", "none");
			$("#master_settings_koboldai_block").css("display", "none");
			if (!is_mobile_user) {
				$("#master_settings_novelai_block").css("display", "grid");
			}
			$("#master_settings_openai_block").css("display", "none");
			$("#singleline_toggle").css("display", "none");
			$("#multigen_toggle").css("display", "grid");
			document.getElementById("hordeInfo").classList.add("hidden");

			main_api = "novel";
		}

		// OpenAI
		if (
			$("#main_api").find(":selected").val() === "openai" ||
			$("#main_api").find(":selected").val() === "proxy"
		) {
			$("#kobold_api").css("display", "none");
			$("#novel_api").css("display", "none");
			$("#openai_api").css("display", "flex");
			$("#horde_api").css("display", "none");
			$("#master_settings_koboldai_block").css("display", "none");
			$("#master_settings_novelai_block").css("display", "none");

			if (!is_mobile_user) {
				$("#master_settings_openai_block").css("display", "grid");
			}

			$("#singleline_toggle").css("display", "none");
			$("#multigen_toggle").css("display", "grid");
			document.getElementById("hordeInfo").classList.add("hidden");
			main_api = $("#main_api").find(":selected").val();

			if (models_holder_openai.length === 0) {
				models_holder_openai = $("#model_openai_select option")
					.map(function () {
						return $(this).val();
					})
					.get();
			}

			if (main_api === "openai") {
				$("#model_openai_select").empty();
				models_holder_openai.forEach(function (item) {
					$("#model_openai_select").append($("<option>", { value: item, text: item }));
				});

				$(`#model_openai_select option[value="${model_openai}"]`).prop("selected", true);
				api_url_openai = default_api_url_openai;

				$("#openai_api_logo").css("display", "flex");
				$("#openai_proxy_adress_block").css("display", "none");

				$("#openai_auth .h4_menu_title").text("API Key");
				$("#openai_auth .h5_menu_help").css("display", "block");

				$("#api_url_openai").val(api_url_openai);
				$("#api_key_openai").val(api_key_openai);
			} else if (main_api === "proxy") {
				is_need_load_models_proxy = true;

				$("#model_openai_select").empty();
				$("#model_openai_select").append(
					$("<option>", { value: "empty", text: "<not loaded>" }),
				);

				$("#openai_api_logo").css("display", "none");
				$("#openai_proxy_adress_block").css("display", "flex");

				$("#openai_auth .h4_menu_title").text("API address and password");
				$("#openai_auth .h5_menu_help").css("display", "none");

				$("#api_url_openai").val(api_url_proxy);
				$("#api_key_openai").val(api_key_proxy);
			}

			openAIChangeMaxContextForModels();
		}

		// HORDE
		if ($("#main_api").find(":selected").val() == "horde") {
			$("#kobold_api").css("display", "none");
			$("#novel_api").css("display", "none");
			$("#openai_api").css("display", "none");
			$("#horde_api").css("display", "block");
			if (!is_mobile_user) {
				$("#master_settings_koboldai_block").css("display", "grid");
			}
			$("#master_settings_novelai_block").css("display", "none");
			$("#master_settings_openai_block").css("display", "none");
			$("#singleline_toggle").css("display", "grid");
			$("#multigen_toggle").css("display", "none");
			document.getElementById("hordeInfo").classList.remove("hidden");
			main_api = "horde";
		}
	}

	async function getUserAvatars() {
		const response = await fetch("/getuseravatars", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": token,
			},
			body: JSON.stringify({}),
		});

		if (response.ok === true) {
			const getData = await response.json();
			//background = getData;
			//console.log(getData.length);
			$("#user_avatar_block").html("");
			for (var i = 0; i < getData.length; i++) {
				//console.log(1);
				$("#user_avatar_block").append(
					`
					<div imgfile="${getData[i]}" class="avatar">
						<img src="User Avatars/${getData[i]}" class="user_avatar_img" />

						<img src="../img/cross.png" class="user_avatar_cross">
					</div>
					`,
				);
			}
			//var aa = JSON.parse(getData[0]);
			//const load_ch_coint = Object.getOwnPropertyNames(getData);
		}
	}

	$(document).on("input", "#temp", function () {
		temp = $(this).val();

		if (isInt(temp)) {
			$("#temp_counter").html($(this).val() + ".00");
		} else {
			$("#temp_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#amount_gen", function () {
		amount_gen = $(this).val();
		$("#amount_gen_counter").html($(this).val() + " Tokens");

		saveSettingsDebounce();
	});

	$("#api_url_openai").on("input", function () {
		$("#api_key_openai").val("");
	});

	$(document).on("blur", "#api_url_openai, #api_key_openai", function () {
		if (main_api === "openai") {
			api_key_openai = $("#api_key_openai").val().trim();
			api_url_openai = default_api_url_openai;
		}

		if (main_api === "proxy") {
			api_key_proxy = $("#api_key_openai").val().trim();

			if ($("#api_url_openai").val()) {
				api_url_proxy = $("#api_url_openai").val().trim();
			}
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#top_p", function () {
		top_p = $(this).val();

		if (isInt(top_p)) {
			$("#top_p_counter").html($(this).val() + ".00");
		} else {
			$("#top_p_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#top_k", function () {
		top_k = $(this).val();
		$("#top_k_counter").html($(this).val());
		saveSettingsDebounce();
	});

	$(document).on("input", "#top_a", function () {
		top_a = $(this).val();

		if (isInt(top_a)) {
			$("#top_a_counter").html($(this).val() + ".00");
		} else {
			$("#top_a_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#typical", function () {
		typical = $(this).val();

		if (isInt(typical)) {
			$("#typical_counter").html($(this).val() + ".00");
		} else {
			$("#typical_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#tfs", function () {
		tfs = $(this).val();

		if (isInt(tfs)) {
			$("#tfs_counter").html($(this).val() + ".00");
		} else {
			$("#tfs_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#rep_pen", function () {
		rep_pen = $(this).val();

		if (isInt(rep_pen)) {
			$("#rep_pen_counter").html($(this).val() + ".00");
		} else {
			$("#rep_pen_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#rep_pen_size", function () {
		rep_pen_size = $(this).val();
		$("#rep_pen_size_counter").html($(this).val() + " Tokens");

		saveSettingsDebounce();
	});

	$(document).on("input", "#rep_pen_slope", function () {
		rep_pen_slope = $(this).val();

		if (isInt(rep_pen_slope)) {
			$("#rep_pen_slope_counter").html($(this).val() + ".00");
		} else {
			$("#rep_pen_slope_counter").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#max_context", function () {
		max_context = parseInt($(this).val());
		$("#max_context_counter").html($(this).val() + " Tokens");

		saveSettingsDebounce();
	});

	$("#style_anchor").on("change", function () {
		style_anchor = !!$("#style_anchor").prop("checked");
		saveSettingsDebounce();
	});

	$("#character_anchor").on("change", function () {
		character_anchor = !!$("#character_anchor").prop("checked");
		saveSettingsDebounce();
	});

	$("#lock_context_size").on("change", function () {
		lock_context_size = !!$("#lock_context_size").prop("checked");
		saveSettingsDebounce();
	});

	$("#multigen").on("change", function () {
		multigen = !!$("#multigen").prop("checked");
		saveSettingsDebounce();
	});

	$("#singleline").on("change", function () {
		singleline = !!$("#singleline").prop("checked");
		saveSettingsDebounce();
	});

	$("#notes_checkbox").on("change", function () {
		settings.notes = !!$("#notes_checkbox").prop("checked");
		$("#option_toggle_notes").css("display", settings.notes ? "block" : "none");
		saveSettingsDebounce();
	});

	$("#autoconnect").on("change", function () {
		settings.auto_connect = !!$("#autoconnect").prop("checked");
		saveSettingsDebounce();
	});

	$("#show_nsfw").on("change", function () {
		charaCloud.show_nsfw = !!$("#show_nsfw").prop("checked");

		charaCloudInit();
		saveSettingsDebounce();
	});

	$("#blur_nsfw").on("change", function () {
		charaCloud.blur_nsfw = !!$("#blur_nsfw").prop("checked");

		if (charaCloud.blur_nsfw) {
			$(".characloud_characters_row_scroll").each((_, card) => {
				$(card)
					.children()
					.each((_, el) => {
						const img = $(el).find(".avatar");

						if (img.parent().parent().attr("is_nsfw") === "true") {
							img.removeClass("show_nsfw")
								.children("img")
								.transition({
									filter: "blur(1rem)",
									duration: 250,
									easing: "ease",
									complete: function () {
										// After the length of transition, remove class and mark animation done.
										img.addClass("nsfw_blur");
									},
								});
						}
					});
			});
		} else {
			$(".characloud_characters_row_scroll").each((_, card) => {
				$(card)
					.children()
					.each((_, el) => {
						const img = $(el).find(".nsfw_blur");
						img.attr("data-isAnimating", true)
							.addClass("show_nsfw")
							// Remove blur with transition effect
							.children("img")
							.transition({
								filter: "blur(0)",
								duration: 250,
								easing: "ease",
								complete: function () {
									// After the length of transition, remove class and mark animation done.
									img.removeClass("nsfw_blur")
										.removeAttr("data-isAnimating")
										.children("img")
										.css({ filter: "" });
								},
							});
					});
			});
		}

		saveSettingsDebounce();
	});

	$("#fix_markdown").on("change", function () {
		fix_markdown = !!$("#fix_markdown").prop("checked");
		saveSettingsDebounce();
	});

	$("#characloud").on("change", function () {
		settings.characloud = !!$("#characloud").prop("checked");
		saveSettingsDebounce();
	});

	$("#swipes").on("change", function () {
		swipes = !!$("#swipes").prop("checked");

		if (swipes) showSwipeButtons();
		else hideSwipeButtons();

		saveSettingsDebounce();
	});

	$("#keep_dialog_examples").on("change", function () {
		keep_dialog_examples = !!$("#keep_dialog_examples").prop("checked");
		saveSettingsDebounce();
	});

	$("#free_char_name_mode").on("change", function () {
		free_char_name_mode = !!$("#free_char_name_mode").prop("checked");
		saveSettingsDebounce();
	});

	//Novel
	$(document).on("input", "#temp_novel", function () {
		temp_novel = $(this).val();

		if (isInt(temp_novel)) {
			$("#temp_counter_novel").html($(this).val() + ".00");
		} else {
			$("#temp_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#amount_gen_novel", function () {
		amount_gen_novel = $(this).val();
		$("#amount_gen_counter_novel").html($(this).val() + " Tokens");

		saveSettingsDebounce();
	});

	$(document).on("input", "#top_p_novel", function () {
		top_p_novel = $(this).val();

		if (isInt(top_p_novel)) {
			$("#top_p_counter_novel").html($(this).val() + ".00");
		} else {
			$("#top_p_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#top_k_novel", function () {
		top_k_novel = $(this).val();
		$("#top_k_counter_novel").html($(this).val());

		saveSettingsDebounce();
	});

	$(document).on("input", "#top_a_novel", function () {
		top_a_novel = $(this).val();

		if (isInt(top_a_novel)) {
			$("#top_a_counter_novel").html($(this).val() + ".00");
		} else {
			$("#top_a_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#typical_novel", function () {
		typical_novel = $(this).val();

		if (isInt(typical_novel)) {
			$("#typical_counter_novel").html($(this).val() + ".00");
		} else {
			$("#typical_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#tfs_novel", function () {
		tfs_novel = $(this).val();

		if (isInt(tfs_novel)) {
			$("#tfs_counter_novel").html($(this).val() + ".00");
		} else {
			$("#tfs_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#rep_pen_novel", function () {
		rep_pen_novel = $(this).val();

		if (isInt(rep_pen_novel)) {
			$("#rep_pen_counter_novel").html($(this).val() + ".00");
		} else {
			$("#rep_pen_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	$(document).on("input", "#rep_pen_size_novel", function () {
		rep_pen_size_novel = $(this).val();
		$("#rep_pen_size_counter_novel").html($(this).val() + " Tokens");

		saveSettingsDebounce();
	});

	// HORDE
	$(document).on("input", "#horde_api_key", function () {
		horde_api_key = $(this).val();
	});

	$("#horde_model_select").change(function () {
		horde_model = $("#horde_model_select").val();
		if (horde_model && horde_model.length) {
			document.getElementById("hordeQueue").innerHTML = "Ready.";
		} else {
			document.getElementById("hordeQueue").innerHTML = "Model not chosen.";
		}
	});

	function updateHordeStats() {
		jQuery.ajax({
			type: "GET",
			url: "/gethordeinfo",
			cache: false,
			contentType: "application/json",
			success: function (data) {
				if (data.hordeData && data.hordeData.finished) {
					Tavern.hordeCheck = false;
					document.getElementById("hordeInfo").classList.remove("hidden");
					document.getElementById("hordeQueue").innerHTML =
						"Finished" +
						(data.hordeData.kudos ? " (" + data.hordeData.kudos + " kudos)" : "");

					if (Tavern.mode === "chat") {
						generateCallback(data.hordeData);
					} else if (Tavern.mode === "story") {
						Story.generateCallback(data.hordeData);
					}

					return;
				}

				if (data.hordeData && data.hordeData.wait_time) {
					document.getElementById("hordeInfo").classList.remove("hidden");
					document.getElementById("hordeQueue").innerHTML =
						"Waiting for generation... (" + data.hordeData.wait_time + ")";
				} else if (data.running && data.queue > 0) {
					document.getElementById("hordeInfo").classList.remove("hidden");
					document.getElementById("hordeQueue").innerHTML =
						"Queue position: " + String(data.queue);
				} else if (data.hordeError || (data.hordeData && data.hordeData.faulted)) {
					if (data.hordeError) {
						console.error(data.hordeError);
					}

					document.getElementById("hordeInfo").classList.remove("hidden");
					document.getElementById("hordeQueue").innerHTML = "Request failed";

					Tavern.hordeCheck = false;
					console.log("Horde generation error");
					return;
				} else {
					document.getElementById("hordeInfo").classList.remove("hidden");
					document.getElementById("hordeQueue").innerHTML = "Queueing...";
				}

				if (Tavern.hordeCheck) {
					setTimeout(updateHordeStats, 1000);
				}
			},
			error: function (jqXHR, exception) {
				Tavern.hordeCheck = false;
				console.error(jqXHR);
				console.error(exception);
			},
		});
	}

	$(document).on("input", "#rep_pen_slope_novel", function () {
		rep_pen_slope_novel = $(this).val();

		if (isInt(rep_pen_slope_novel)) {
			$("#rep_pen_slope_counter_novel").html($(this).val() + ".00");
		} else {
			$("#rep_pen_slope_counter_novel").html($(this).val());
		}

		saveSettingsDebounce();
	});

	//OpenAi
	$(document).on("input", "#temp_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) temp_openai = $(this).val();
		else if (isProxy) temp_proxy = $(this).val();

		$("#temp_counter_openai").html(addZero($(this).val()));
		saveSettingsDebounce();
	});

	$(document).on("input", "#top_p_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) top_p_openai = $(this).val();
		else if (isProxy) top_p_proxy = $(this).val();

		$("#top_p_counter_openai").html(addZero($(this).val()));
		saveSettingsDebounce();
	});

	$(document).on("input", "#freq_pen_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) freq_pen_openai = $(this).val();
		else if (isProxy) freq_pen_proxy = $(this).val();

		$("#freq_pen_counter_openai").html(addZero($(this).val()));
		saveSettingsDebounce();
	});

	$(document).on("input", "#pres_pen_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) pres_pen_openai = $(this).val();
		else if (isProxy) pres_pen_proxy = $(this).val();

		$("#pres_pen_counter_openai").html(addZero($(this).val()));
		saveSettingsDebounce();
	});

	$(document).on("input", "#max_context_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) max_context_openai = $(this).val();
		else if (isProxy) max_context_proxy = $(this).val();

		$("#max_context_counter_openai").html($(this).val());
		saveSettingsDebounce();
	});

	$(document).on("input", "#amount_gen_openai", function () {
		const isOpenAI = main_api === "openai";
		const isProxy = main_api === "proxy";

		if (isOpenAI) amount_gen_openai = $(this).val();
		else if (isProxy) amount_gen_proxy = $(this).val();

		$("#amount_gen_counter_openai").html($(this).val());
		saveSettingsDebounce();
	});

	/**
	 * @author SillyTavern <https://github.com/SillyTavern/SillyTavern>
	 */
	$(document).on("input", ".range_block_input [contenteditable='true']", function () {
		const caretPosition = saveCaretPosition($(this).get(0));
		const myText = $(this).text().trim();

		if (myText.length === 0) {
			$(this).text(0);
			return;
		}

		$(this).text(myText); // trim line breaks and spaces
		const masterSelector = $(this).data("for");
		const masterElement = document.getElementById(masterSelector);

		if (masterElement == null) {
			console.error("Master input element not found for the editable label", masterSelector);
			return;
		}

		const myValue = Number(myText);

		if (Number.isNaN(myValue)) {
			$(masterElement).trigger("input");
			restoreCaretPosition($(this).get(0), caretPosition);
			return;
		}

		const masterMin = Number($(masterElement).attr("min"));
		const masterMax = Number($(masterElement).attr("max"));

		if (myValue < masterMin) {
			restoreCaretPosition($(this).get(0), caretPosition);
			return;
		}

		if (myValue > masterMax) {
			restoreCaretPosition($(this).get(0), caretPosition);
			return;
		}

		$(masterElement).val(myValue).trigger("input");
		restoreCaretPosition($(this).get(0), caretPosition);
	});

	$(document).on("blur", ".range_block_input [contenteditable='true']", function () {
		const myText = $(this).text().trim();
		$(this).text(myText); // trim line breaks and spaces

		const masterSelector = $(this).data("for");
		const masterElement = document.getElementById(masterSelector);

		const myValue = Number(myText);

		if (Number.isNaN(myValue)) return;

		const masterMin = Number($(masterElement).attr("min"));
		const masterMax = Number($(masterElement).attr("max"));

		if (myValue < masterMin) {
			$(masterElement).val(masterMin).trigger("input");
		} else if (myValue > masterMax) {
			$(masterElement).val(masterMax).trigger("input");
		}
	});

	function addZero(number) {
		return number + (isInt(number) ? ".00" : "");
	}

	// *************** SETTINGS **************** //
	///////////////////////////////////////////
	function setOpenAISettings(data, openai_settings) {
		temp_openai = openai_settings.temp ?? temp_openai;
		top_p_openai = openai_settings.top_p ?? top_p_openai;
		freq_pen_openai = openai_settings.freq_pen ?? freq_pen_openai;
		pres_pen_openai = openai_settings.pres_pen ?? pres_pen_openai;
		amount_gen_openai = openai_settings.amount_gen ?? amount_gen_openai;
		max_context_openai = openai_settings.max_context ?? max_context_openai;

		api_key_openai = openai_settings.api_key;
		api_url_openai = default_api_url_openai;

		openai_stream = openai_settings.stream ?? false;
		openai_enhance_definitions = openai_settings.enhance_definitions ?? false;
		openai_send_jailbreak = openai_settings.send_jailbreak ?? false;
		openai_nsfw_encouraged = openai_settings.nsfw_encouraged ?? false;
		openai_nsfw_prioritized = openai_settings.nsfw_prioritized ?? false;

		model_openai = openai_settings.model;

		if (data.openAI && data.openAI.perset_settings) {
			perset_settings_openai = data.openAI.perset_settings;
		}

		$(
			`#settings_perset_openai option[value="${persets_setting_names[perset_settings_openai]}"]`,
		).prop("selected", true);

		$(`#model_openai_select option[value="${model_openai}"]`).prop("selected", true);
		openAIChangeMaxContextForModels();

		$("#api_key_openai").val(api_key_openai);
		$("#api_url_openai").val(api_url_openai);
		$("#openai_stream").prop("checked", openai_stream);
		$("#openai_enhance_definitions").prop("checked", openai_enhance_definitions);
		$("#openai_send_jailbreak").prop("checked", openai_send_jailbreak);
		$("#openai_nsfw_encouraged").prop("checked", openai_nsfw_encouraged);
		$("#openai_nsfw_prioritized").prop("checked", openai_nsfw_prioritized);

		$("#temp_openai").val(temp_openai);
		$("#top_p_openai").val(top_p_openai);
		$("#freq_pen_openai").val(freq_pen_openai);
		$("#pres_pen_openai").val(pres_pen_openai);
		$("#amount_gen_openai").val(amount_gen_openai);
		$("#max_context_openai").val(max_context_openai);

		$("#temp_counter_openai").text(addZero(temp_openai));
		$("#top_p_counter_openai").text(addZero(top_p_openai));
		$("#freq_pen_counter_openai").text(addZero(freq_pen_openai));
		$("#pres_pen_counter_openai").text(addZero(pres_pen_openai));
		$("#amount_gen_counter_openai").text(amount_gen_openai);
		$("#max_context_counter_openai").text(max_context_openai);

		// Disable edit and delete if perset is default
		$("#openai_perset_delete").prop("disabled", perset_settings_openai === "Default");
		$("#openai_perset_edit").prop("disabled", perset_settings_openai === "Default");
	}

	function setProxySettings(data, proxy_settings) {
		temp_proxy = proxy_settings.temp ?? temp_proxy;
		top_p_proxy = proxy_settings.top_p ?? top_p_proxy;
		pres_pen_proxy = proxy_settings.pres_pen ?? pres_pen_proxy;
		freq_pen_proxy = proxy_settings.freq_pen ?? freq_pen_proxy;
		amount_gen_proxy = proxy_settings.amount_gen ?? amount_gen_proxy;
		max_context_proxy = proxy_settings.max_context ?? max_context_proxy;

		api_key_proxy = proxy_settings.api_key;
		api_url_proxy = proxy_settings.api_url;

		proxy_stream = proxy_settings.stream ?? false;
		proxy_enhance_definitions = proxy_settings.enhance_definitions ?? false;
		proxy_send_jailbreak = proxy_settings.send_jailbreak ?? false;
		proxy_nsfw_encouraged = proxy_settings.nsfw_encouraged ?? false;
		proxy_nsfw_prioritized = proxy_settings.nsfw_prioritized ?? false;

		model_proxy = proxy_settings.model;

		if (data.proxy && data.proxy.perset_settings) {
			perset_settings_proxy = data.proxy.perset_settings;
		}

		$(
			`#settings_perset_openai option[value="${persets_setting_names[perset_settings_proxy]}"]`,
		).prop("selected", true);

		$(`#model_openai_select option[value="${model_proxy}"]`).prop("selected", true);
		openAIChangeMaxContextForModels();

		$("#api_key_openai").val(api_key_proxy);
		$("#api_url_openai").val(api_url_proxy);
		$("#openai_stream").prop("checked", proxy_stream);
		$("#openai_enhance_definitions").prop("checked", proxy_enhance_definitions);
		$("#openai_send_jailbreak").prop("checked", proxy_send_jailbreak);
		$("#openai_nsfw_encouraged").prop("checked", proxy_nsfw_encouraged);
		$("#openai_nsfw_prioritized").prop("checked", proxy_nsfw_prioritized);

		$("#temp_openai").val(temp_proxy);
		$("#top_p_openai").val(top_p_proxy);
		$("#freq_pen_openai").val(freq_pen_proxy);
		$("#pres_pen_openai").val(pres_pen_proxy);
		$("#amount_gen_openai").val(amount_gen_proxy);
		$("#max_context_openai").val(max_context_proxy);

		$("#temp_counter_openai").text(addZero(temp_proxy));
		$("#top_p_counter_openai").text(addZero(top_p_proxy));
		$("#freq_pen_counter_openai").text(addZero(freq_pen_proxy));
		$("#pres_pen_counter_openai").text(addZero(pres_pen_proxy));
		$("#amount_gen_counter_openai").text(amount_gen_proxy);
		$("#max_context_counter_openai").text(max_context_proxy);

		// Disable edit and delete if perset is default
		$("#openai_perset_delete").prop("disabled", perset_settings_proxy === "Default");
		$("#openai_perset_edit").prop("disabled", perset_settings_proxy === "Default");
	}

	async function getOpenAIPersetSettings(perset_name) {
		await fetch("/get_perset", {
			method: "POST",
			cache: "no-cache",
			body: JSON.stringify({ name: perset_name }),
			headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
		}).then(async (res) => {
			const { persets_list, persets_name_list } = await res.json();
			persets_settings[persets_setting_names[persets_name_list]] = JSON.parse(persets_list);
		});
	}

	async function getAllOpenAIPersetSettings() {
		await fetch("/get_perset", {
			method: "POST",
			cache: "no-cache",
			headers: { "X-CSRF-Token": token },
		}).then(async (res) => {
			/**
			 * @type {{ persets_list: string[], persets_name_list: string[] }}
			 */
			const data = await res.json();

			data.persets_list.map((item, i) => (persets_settings[i] = JSON.parse(item)));
			persets_setting_names = data.persets_name_list.reduce((prev, curr, i) => {
				return { ...prev, [curr]: i };
			}, {});
		});
	}

	async function getSettings() {
		await fetch("/getsettings", {
			method: "POST",
			cache: "no-cache",
			headers: { "X-CSRF-Token": token },
		})
			.then(async (res) => {
				const data = await res.json();

				if (res.status >= 299) {
					if (!is_checked_colab) isColab();
					return;
				}

				settings = JSON.parse(data.settings);
				templates = data.templates;

				charaCloudServer = data.charaCloudServer;
				characterFormat = data.characterFormat;

				let classic_style_id;

				if (settings.user.username) {
					name1 = settings.user.username;
					$("#your_name").val(name1);
				}

				templates.forEach(function (item, i) {
					if (item == "classic.css") classic_style_id = i;
				});

				if (classic_style_id !== undefined) {
					templates.splice(classic_style_id, 1);
					templates.unshift("classic.css");
				}

				templates.forEach(function (item, i) {
					const style_id = "style_button" + i;
					const img_src = "../templates/" + item.replace(".css", ".png");

					$("#style_menu").append(
						`<div class="style_button" style_id="${i}" id="${style_id}" alt="${item}">
							<img src="${img_src}">
						</div>`,
					);
				});

				if (settings.api.main_api) {
					main_api = settings.api.main_api;
					$(`#main_api option[value="${main_api}"]`).prop("selected", true);

					changeMainAPI();
				}

				// User
				user_avatar = settings.user.user_avatar;
				$(".mes").each(function () {
					if ($(this).attr("ch_name") == name1) {
						$(this)
							.children(".avatar")
							.children("img")
							.attr("src", "User Avatars/" + user_avatar);
					}
				});

				// KoboldAI
				const koboldAI_settings = settings.koboldAI;

				preset_settings = koboldAI_settings.preset_settings;
				api_server = koboldAI_settings.api_server;
				$("#api_url_text").val(api_server);

				temp = koboldAI_settings.temp;
				top_p = koboldAI_settings.top_p;
				top_k = koboldAI_settings.top_k;
				top_a = koboldAI_settings.top_a;
				typical = koboldAI_settings.typical;
				tfs = koboldAI_settings.tfs;

				amount_gen = koboldAI_settings.amount_gen;
				max_context = koboldAI_settings.max_context;

				rep_pen = koboldAI_settings.rep_pen;
				rep_pen_size = koboldAI_settings.rep_pen_size;
				rep_pen_slope = koboldAI_settings.rep_pen_slope;

				koboldai_setting_names = data.koboldai_setting_names;
				koboldai_settings = data.koboldai_settings;

				koboldai_settings.forEach(function (item, i, arr) {
					koboldai_settings[i] = JSON.parse(item);
				});

				var arr_holder = {};
				//$("#settings_perset").empty();
				koboldai_setting_names.forEach(function (item, i, arr) {
					arr_holder[item] = i;
					$("#settings_perset").append(`<option value="${i}"> ${item} "</option>`);
				});

				koboldai_setting_names = {};
				koboldai_setting_names = arr_holder;

				$("#temp").val(temp);
				$("#temp_counter").html(addZero(temp));

				$("#top_p").val(top_p);
				$("#top_p_counter").html(addZero(top_p));

				$("#top_k").val(top_k);
				$("#top_k_counter").html(top_k);

				$("#top_a").val(top_a);
				$("#top_a_counter").html(addZero(top_a));

				$("#typical").val(typical);
				$("#typical_counter").html(addZero(typical));

				$("#tfs").val(tfs);
				$("#tfs_counter").html(addZero(tfs));

				$("#max_context").val(max_context);
				$("#max_context_counter").html(max_context + " Tokens");

				$("#amount_gen").val(amount_gen);
				$("#amount_gen_counter").html(amount_gen + " Tokens");

				$("#rep_pen").val(rep_pen);
				$("#rep_pen_counter").html(addZero(rep_pen));

				$("#rep_pen_slope").val(rep_pen_slope);
				$("#rep_pen_slope_counter").html(addZero(rep_pen_slope));

				$("#rep_pen_size").val(rep_pen_size);
				$("#rep_pen_size_counter").html(rep_pen_size + " Tokens");

				//////////////////////
				if (preset_settings == "gui") {
					$("#settings_perset option[value=gui]").attr("selected", "true");
					$("#range_block").children().prop("disabled", true);
					$("#range_block").css("opacity", 0.5);

					$("#top_p_block").children().prop("disabled", true);
					$("#top_p_block").css("opacity", 0.45);

					$("#top_k_block").children().prop("disabled", true);
					$("#top_k_block").css("opacity", 0.45);

					$("#top_a_block").children().prop("disabled", true);
					$("#top_a_block").css("opacity", 0.45);

					$("#typical_block").children().prop("disabled", true);
					$("#typical_block").css("opacity", 0.45);

					$("#tfs_block").children().prop("disabled", true);
					$("#tfs_block").css("opacity", 0.45);

					$("#rep_pen_size_block").children().prop("disabled", true);
					$("#rep_pen_size_block").css("opacity", 0.45);

					$("#rep_pen_slope_block").children().prop("disabled", true);
					$("#rep_pen_slope_block").css("opacity", 0.45);

					$("#amount_gen_block").children().prop("disabled", true);
					$("#amount_gen_block").css("opacity", 0.45);
				} else {
					if (typeof koboldai_setting_names[preset_settings] !== "undefined") {
						$(
							`#settings_perset option[value="${koboldai_setting_names[preset_settings]}"]`,
						).prop("selected", true);
					} else {
						$("#range_block").children().prop("disabled", true);
						$("#range_block").css("opacity", 0.5);

						$("#range_block").children().prop("disabled", true);
						$("#range_block").css("opacity", 0.5);

						$("#top_p_block").children().prop("disabled", true);
						$("#top_p_block").css("opacity", 0.45);

						$("#top_k_block").children().prop("disabled", true);
						$("#top_k_block").css("opacity", 0.45);

						$("#top_a_block").children().prop("disabled", true);
						$("#top_a_block").css("opacity", 0.45);

						$("#typical_block").children().prop("disabled", true);
						$("#typical_block").css("opacity", 0.45);

						$("#tfs_block").children().prop("disabled", true);
						$("#tfs_block").css("opacity", 0.45);

						$("#rep_pen_size_block").children().prop("disabled", true);
						$("#rep_pen_size_block").css("opacity", 0.45);

						$("#rep_pen_slope_block").children().prop("disabled", true);
						$("#rep_pen_slope_block").css("opacity", 0.45);

						$("#amount_gen_block").children().prop("disabled", true);
						$("#amount_gen_block").css("opacity", 0.45);

						preset_settings = "gui";
						$("#settings_perset option[value=gui]").prop("selected", true);
					}
				}

				// NovelAI
				const novelAI_settings = settings.novelAI;

				temp_novel = novelAI_settings.temp_novel;
				top_p_novel = novelAI_settings.top_p_novel;
				top_k_novel = novelAI_settings.top_k_novel;
				top_a_novel = novelAI_settings.top_a_novel;
				typical_novel = novelAI_settings.typical_novel;
				tfs_novel = novelAI_settings.tfs_novel;

				amount_gen_novel = novelAI_settings.amount_gen_novel;

				rep_pen_novel = novelAI_settings.rep_pen_novel;
				rep_pen_size_novel = novelAI_settings.rep_pen_size_novel;
				rep_pen_slope_novel = novelAI_settings.rep_pen_slope_novel;

				api_key_novel = novelAI_settings.api_key_novel || "";
				$("#api_key_novel").val(api_key_novel);

				model_novel = novelAI_settings.model_novel;
				$(`#model_novel_select option[value="${model_novel}"]`).prop("selected", true);

				novelai_setting_names = data.novelai_setting_names;
				novelai_settings = data.novelai_settings;

				novelai_settings.forEach(function (item, i, arr) {
					novelai_settings[i] = JSON.parse(item);
				});

				var arr_holder = {};
				$("#settings_perset_novel").empty();
				novelai_setting_names.forEach(function (item, i, arr) {
					arr_holder[item] = i;
					$("#settings_perset_novel").append(`<option value="${i}">" ${item} "</option>`);
				});

				novelai_setting_names = arr_holder;
				preset_settings_novel = settings.preset_settings_novel;

				$(
					`#settings_perset_novel option[value="${novelai_setting_names[preset_settings_novel]}"]`,
				).prop("selected", true);

				$("#temp_novel").val(temp_novel);
				$("#temp_counter_novel").html(addZero(temp_novel));

				$("#top_p_novel").val(top_p_novel);
				$("#top_p_counter_novel").html(addZero(top_p_novel));

				$("#top_k_novel").val(top_k_novel);
				$("#top_k_counter_novel").html(top_k_novel);

				$("#top_a_novel").val(top_a_novel);
				$("#top_a_counter_novel").html(addZero(top_a_novel));

				$("#typical_novel").val(typical_novel);
				$("#typical_counter_novel").html(addZero(typical_novel));

				$("#tfs_novel").val(tfs_novel);
				$("#tfs_counter_novel").html(addZero(tfs_novel));

				$("#amount_gen_novel").val(amount_gen_novel);
				$("#amount_gen_counter_novel").html(amount_gen_novel + " Tokens");

				$("#rep_pen_novel").val(rep_pen_novel);
				$("#rep_pen_counter_novel").html(addZero(rep_pen_novel));

				$("#rep_pen_slope_novel").val(rep_pen_slope_novel);
				$("#rep_pen_slope_counter_novel").html(addZero(rep_pen_slope_novel));

				$("#rep_pen_size_novel").val(rep_pen_size_novel);
				$("#rep_pen_size_counter_novel").html(rep_pen_size_novel + " Tokens");

				// Load persets
				persets_setting_names = data.persets_name_list;
				persets_settings = data.persets_list;

				persets_settings.forEach((item, i) => (persets_settings[i] = JSON.parse(item)));

				var arr_holder = {};
				$("#settings_perset_openai").empty();
				persets_setting_names.forEach(function (item, i) {
					arr_holder[item] = i;
					$("#settings_perset_openai").append(`<option value=${i}>${item}</option>`);
				});

				persets_setting_names = arr_holder;

				// OpenAI
				const openAI_settings = settings.openAI;
				setOpenAISettings(settings, openAI_settings);

				// Proxy
				const proxy_settings = settings.proxy;
				setProxySettings(settings, proxy_settings);

				// Load System Prompt.
				if (main_api === "openai") {
					SystemPrompt.selectWithLoad(
						openAI_settings.system_prompt_preset_chat ?? SystemPrompt.empty_prest_id,
					);
				} else if (main_api === "proxy") {
					SystemPrompt.selectWithLoad(
						proxy_settings.system_prompt_preset_chat ?? SystemPrompt.empty_prest_id,
					);
				}

				// General Settings
				const general_settings = settings.api;

				anchor_order = general_settings.anchor_order;
				pygmalion_formating = general_settings.pygmalion_formating;
				style_anchor = !!general_settings.style_anchor;
				character_anchor = !!general_settings.character_anchor; //if(settings.character_anchor !== undefined) character_anchor = !!settings.character_anchor;
				lock_context_size = !!general_settings.lock_context_size;

				fix_markdown = general_settings.fix_markdown;

				multigen = !!general_settings.multigen;
				singleline = !!general_settings.singleline;
				swipes = !!general_settings.swipes;

				keep_dialog_examples = !!general_settings.keep_dialog_examples;
				free_char_name_mode = !!general_settings.free_char_name_mode;

				settings.notes = general_settings.notes;
				settings.auto_connect = general_settings.auto_connect;
				settings.characloud = general_settings.characloud;

				if (typeof general_settings.show_nsfw !== "undefined")
					charaCloud.show_nsfw = general_settings.show_nsfw;

				if (typeof general_settings.blur_nsfw !== "undefined")
					charaCloud.blur_nsfw = general_settings.blur_nsfw;

				if (general_settings.characloud) showCharaCloud();

				character_sorting_type = general_settings.character_sorting_type;
				$(`#rm_folder_order option[value="${character_sorting_type}"]`).prop(
					"selected",
					true,
				);

				if (!winNotes) {
					if (!is_room) {
						winNotes = new Notes({
							root: document.getElementById("shadow_notes_popup"),
							save: saveChat.bind(this),
						});
					} else {
						winNotes = new Notes({
							root: document.getElementById("shadow_notes_popup"),
							save: saveChatRoom.bind(this),
						});
					}
				}

				if (!winWorldInfo) {
					winWorldInfo = new UIWorldInfoMain({
						root: document.getElementById("shadow_worldinfo_popup"),
						worldName: general_settings.worldName || null,
						metaSave: function (worldName) {
							general_settings.worldName = worldName;
							saveSettings();
						}.bind(this),
					});
				}

				document.getElementById("input_worldinfo_depth").value =
					general_settings.world_depth ? general_settings.world_depth : 2;

				document.getElementById("input_worldinfo_budget").value =
					general_settings.world_budget ? general_settings.world_budget : 100;

				document.getElementById("input_worldinfo_depth").onchange = function (event) {
					general_settings.world_depth = parseInt(event.target.value);
				}.bind(this);

				document.getElementById("input_worldinfo_budget").onchange = function (event) {
					general_settings.world_budget = parseInt(event.target.value);
				}.bind(this);

				$("#style_anchor").prop("checked", style_anchor);
				$("#character_anchor").prop("checked", character_anchor);
				$("#lock_context_size").prop("checked", lock_context_size);
				$("#multigen").prop("checked", multigen);
				$("#singleline").prop("checked", singleline);
				$("#autoconnect").prop("checked", settings.auto_connect);

				$("#show_nsfw").prop("checked", charaCloud.show_nsfw);
				$("#blur_nsfw").prop("checked", charaCloud.blur_nsfw);

				$("#fix_markdown").prop("checked", fix_markdown);

				$("#characloud").prop("checked", settings.characloud);
				$("#notes_checkbox").prop("checked", settings.notes);
				$("#swipes").prop("checked", swipes);
				$("#keep_dialog_examples").prop("checked", keep_dialog_examples);
				$("#free_char_name_mode").prop("checked", free_char_name_mode);

				$("#option_toggle_notes").css("display", settings.notes ? "block" : "none");

				$(`#anchor_order option[value="${anchor_order}"]`).prop("selected", true);
				$(`#pygmalion_formating option[value="${pygmalion_formating}"]`).prop(
					"selected",
					true,
				);

				// Auto connect
				if (general_settings.auto_connect && !is_colab) {
					setTimeout(function () {
						/**
						 * @type {"kobold" | "novel" | "openai" | "horde" | "proxy"}
						 */
						const main_api_selected = main_api;

						if (main_api_selected == "kobold" && api_server) {
							$("#api_button").trigger("click");
						} else if (main_api_selected == "horde") {
							$("#api_button_horde").trigger("click");
						} else if (main_api_selected == "novel" && api_key_novel) {
							$("#api_button_novel").trigger("click");
						} else if (main_api_selected == "openai" && api_key_openai) {
							$("#api_button_openai").trigger("click");
						} else if (main_api_selected === "proxy" && api_url_proxy) {
							$("#api_button_openai").trigger("click");
						}
					}, 500);
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}

	async function saveColorStyles() {
		let styleString = "";
		for (const [key, value] of user_customization) {
			styleString += `\t${key}: ${value};\n`;
		}

		await fetch("/savecolorstyle", {
			headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
			body: JSON.stringify({ css: `:root { \n${styleString} }` }),
			method: "POST",
		})
			.then(async (res) => {
				console.log(await res.json());
			})
			.catch((err) => {
				console.log(err);
			});
	}

	async function saveSettings() {
		const isOpenAI = main_api === "openai",
			isProxy = main_api === "proxy";

		let system_prompt_preset_chat_openai =
				settings.openAI.system_prompt_preset_chat ?? SystemPrompt.empty_prest_id,
			system_prompt_preset_room_openai =
				settings.openAI.system_prompt_preset_room ?? SystemPrompt.empty_prest_id;

		let system_prompt_preset_chat_proxy =
				settings.proxy.system_prompt_preset_chat ?? SystemPrompt.empty_prest_id,
			system_prompt_preset_room_proxy =
				settings.proxy.system_prompt_preset_room ?? SystemPrompt.empty_prest_id;

		if (isOpenAI) {
			if (getIsRoomList()) {
				system_prompt_preset_room_openai = SystemPrompt.selected_preset_name;
			} else {
				system_prompt_preset_chat_openai = SystemPrompt.selected_preset_name;
			}
		}

		if (isProxy) {
			if (getIsRoomList()) {
				system_prompt_preset_room_proxy = SystemPrompt.selected_preset_name;
			} else {
				system_prompt_preset_chat_proxy = SystemPrompt.selected_preset_name;
			}
		}

		const data = {
			// User Settings
			user: {
				username: name1,
				user_avatar: user_avatar,
			},

			style: {},

			// KoboldAI Settings
			koboldAI: {
				api_server: api_server,
				preset_settings: preset_settings,

				temp: temp,
				top_p: top_p,
				top_k: top_k,
				top_a: top_a,
				typical: typical,
				tfs: tfs,
				amount_gen: amount_gen,
				max_context: max_context,
				rep_pen: rep_pen,
				rep_pen_size: rep_pen_size,
				rep_pen_slope: rep_pen_slope,
			},

			// World Settings
			world: {
				worldName: settings.worldName || null,
				world_depth: settings.world_depth || 2,
				world_budget: settings.world_budget || 100,
			},

			// Novel Settings
			novelAI: {
				model_novel: model_novel,
				api_key_novel: api_key_novel,
				preset_settings_novel: preset_settings_novel,

				temp_novel: temp_novel,
				top_p_novel: top_p_novel,
				top_k_novel: top_k_novel,
				top_a_novel: top_a_novel,
				typical_novel: typical_novel,
				tfs_novel: tfs_novel,
				amount_gen_novel: amount_gen_novel,
				rep_pen_novel: rep_pen_novel,
				rep_pen_size_novel: rep_pen_size_novel,
				rep_pen_slope_novel: rep_pen_slope_novel,
			},

			// OpenAI Settings
			openAI: {
				perset_settings: perset_settings_openai,
				system_prompt_preset_chat_: system_prompt_preset_chat_openai,
				system_prompt_preset_room_: system_prompt_preset_room_openai,
				api_key: api_key_openai,

				model: model_openai,

				stream: openai_stream,
				enhance_definitions: openai_enhance_definitions,
				send_jailbreak: openai_send_jailbreak,
				nsfw_encouraged: openai_nsfw_encouraged,
				nsfw_prioritized: openai_nsfw_prioritized,

				temp: parseFloat(temp_openai),
				top_p: parseFloat(top_p_openai),
				freq_pen: parseFloat(freq_pen_openai),
				pres_pen: parseFloat(pres_pen_openai),
				max_context: parseInt(max_context_openai),
				amount_gen: parseInt(amount_gen_openai),
			},

			proxy: {
				perset_settings: perset_settings_proxy,
				system_prompt_preset_chat: system_prompt_preset_chat_proxy,
				system_prompt_preset_room: system_prompt_preset_room_proxy,
				api_key: api_key_proxy,
				api_url: api_url_proxy,

				model: model_proxy,

				stream: proxy_stream,
				enhance_definitions: proxy_enhance_definitions,
				send_jailbreak: proxy_send_jailbreak,
				nsfw_encouraged: proxy_nsfw_encouraged,
				nsfw_prioritized: proxy_nsfw_prioritized,

				temp: parseFloat(temp_proxy),
				top_p: parseFloat(top_p_proxy),
				freq_pen: parseFloat(freq_pen_proxy),
				pres_pen: parseFloat(pres_pen_proxy),
				max_context: parseInt(max_context_proxy),
				amount_gen: parseInt(amount_gen_proxy),
			},

			api: {
				// API Settings
				main_api: main_api,
				auto_connect: settings.auto_connect ?? false,

				multigen: multigen,
				singleline: singleline,
				swipes: swipes,

				keep_dialog_examples: keep_dialog_examples,
				free_char_name_mode: free_char_name_mode,
				notes: settings.notes ?? false,

				character_sorting_type: character_sorting_type,
				characloud: settings.characloud ?? false,
				show_nsfw: charaCloud.show_nsfw ?? false,
				blur_nsfw: charaCloud.blur_nsfw ?? false,

				// Misc
				fix_markdown: fix_markdown,

				// Pygmalion Formating Settings
				anchor_order: anchor_order,
				pygmalion_formating: pygmalion_formating,
				style_anchor: style_anchor,
				character_anchor: character_anchor,
				lock_context_size: lock_context_size,
			},
		};

		await fetch("/savesettings", {
			method: "POST",
			cache: "no-cache",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
		})
			.then(async (res) => {
				console.log(await res.json());
			})
			.catch((err) => console.error(err));

		await getOpenAIPersetSettings(
			main_api === "openai" ? perset_settings_openai : perset_settings_proxy,
		);
	}

	$("#donation").on("click", function () {
		$("#shadow_tips_popup").css("display", "block");
		$("#shadow_tips_popup").transition({
			opacity: 1.0,
			duration: 100,
			easing: animation_rm_easing,
			complete: function () {},
		});
	});

	$("#tips_cross").on("click", function () {
		$("#shadow_tips_popup").transition({
			opacity: 0.0,
			duration: 100,
			easing: animation_rm_easing,
			complete: function () {
				$("#shadow_tips_popup").css("display", "none");
			},
		});
	});

	$("#select_chat_cross").on("click", function () {
		$("#shadow_select_chat_popup").css("display", "none");
		$("#load_select_chat_div").css("display", "block");
	});

	function isInt(value) {
		return !isNaN(value) && parseInt(Number(value)) == value && !isNaN(parseInt(value, 10));
	}

	//**********************//
	//*** Message Editor ***//
	function messageRoot(anyChild) {
		while (
			anyChild &&
			anyChild.length &&
			anyChild.attr &&
			(anyChild.attr("mesid") === undefined || anyChild.attr("mesid") === null) &&
			anyChild.parent
		) {
			anyChild = anyChild.parent();
		}
		if (
			anyChild &&
			anyChild.attr &&
			anyChild.attr("mesid") !== undefined &&
			anyChild.attr("mesid") !== null
		) {
			return anyChild;
		}
		return null;
	}

	function toggleEdit(messageRoot, toState = false) {
		if (!messageRoot) return;

		messageRoot.find(".mes_btn_group").css("display", toState ? "none" : "flex");
		const editBlock = messageRoot.find(".edit_block");

		editBlock.css("display", toState ? "flex" : "none");

		if (toState) {
			editBlock.css("opacity", 0);
			editBlock.transition({
				opacity: 1.0,
				duration: 600,
				easing: "",
				complete: function () {},
			});
		}
	}

	function recalculateChatMesids() {
		const childs = $("#chat")[0].childNodes;
		for (let index = 0; index < childs.length; index++) {
			const child = childs[index];
			child.setAttribute("mesid", index);
			child.setAttribute("class", index === childs.length - 1 ? "mes last_mes" : "mes");
		}
	}

	$(document).on("click", ".mes_copy", function () {
		if (navigator.clipboard === undefined) return;

		const mesId = $(this).parent().parent().attr("mesid");
		const current_chat = chat[parseInt(mesId)];

		const icon = $(this).find("i");

		navigator.clipboard.writeText(current_chat.mes);

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

	$(document).on("click", ".mes_edit", function () {
		if (Characters.selectedID == undefined) return;

		let run_edit = true;
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		const edit_mes_id = root ? parseInt(root.attr("mesid")) : NaN;
		if (isNaN(edit_mes_id)) {
			return;
		}
		if (this_edit_mes_id !== undefined) {
			return;
		}

		if (edit_mes_id == count_view_mes - 1) {
			//if the generating swipe (...)
			if (chat[edit_mes_id]["swipe_id"] !== undefined) {
				if (chat[edit_mes_id]["swipes"].length === chat[edit_mes_id]["swipe_id"]) {
					run_edit = false;
				}
			}
			if (run_edit) {
				hideSwipeButtons();
			}
		}

		if (run_edit) {
			let chatScrollPosition = $("#chat").scrollTop();
			if (this_edit_mes_id !== undefined) {
				let mes_edited = $("#chat")
					.children()
					.filter('[mesid="' + this_edit_mes_id + '"]')
					.children(".mes_block")
					.children(".ch_name")
					.children(".mes_edit_done");

				messageEditDone(mes_edited);
			}

			root.find(".mes_text").empty();
			toggleEdit(root, true);
			this_edit_mes_id = edit_mes_id;
			root.find(".mes_up").attr(
				"class",
				this_edit_mes_id == 0 ? "mes_up disabled" : "mes_up",
			);
			root.find(".mes_down").attr(
				"class",
				this_edit_mes_id == chat.length - 1 ? "mes_down disabled" : "mes_down",
			);

			if (chat[this_edit_mes_id].chid === undefined && !chat[this_edit_mes_id].is_user) {
				chat[this_edit_mes_id].chid = parseInt(Characters.selectedID);
			}

			let nameSelect = root.find(".name_select");
			nameSelect.css("display", "block");
			nameSelect.empty();
			nameSelect.append(
				`
				<option value="-1"	class="player" ${chat[this_edit_mes_id].is_user ? 'selected="selected"' : ""}> 
					${name1}
				</option>
				`,
			);

			if (!is_room) {
				const isSelected =
					chat[this_edit_mes_id].chid == parseInt(Characters.selectedID)
						? 'selected="selected"'
						: "";

				nameSelect.append(
					`
					<option value="${Characters.selectedID}" class="host" ${isSelected}>
						${name2}
					</option>
					`,
				);
			} else {
				Rooms.selectedCharacters.forEach(function (ch_id, i) {
					const isSelected =
						chat[this_edit_mes_id].chid == parseInt(ch_id) ? 'selected="selected"' : "";

					nameSelect.append(
						`
						<option value="${ch_id}" class="host" ${isSelected} >
							${Characters.id[ch_id].name}
						</option>
						`,
					);
				});

				// If the message character is no longer part of the selected characters
				if (
					!Rooms.selectedCharacterNames.includes(chat[this_edit_mes_id].name) &&
					!chat[this_edit_mes_id].is_user
				) {
					if (chat[this_edit_mes_id].chid >= 0) {
						// If the character has not been deleted
						nameSelect.append(
							'<option value="' +
								chat[this_edit_mes_id].chid +
								'" class="host" selected="selected">' +
								chat[this_edit_mes_id].name +
								"</option>",
						);
					} else {
						nameSelect.append(
							'<option value="-2" class="host" selected="selected">' +
								chat[this_edit_mes_id].name +
								"</option>",
						);
					}
				}
			}

			root.find(".ch_name").css("display", "none");

			var text = chat[edit_mes_id]["mes"];
			if (chat[edit_mes_id]["is_user"]) {
				this_edit_mes_chname = name1;
			} else {
				if (!is_room) {
					this_edit_mes_chname = name2;
				} else {
					if (Characters.id[chat[this_edit_mes_id].chid] != undefined)
						this_edit_mes_chname = Characters.id[chat[this_edit_mes_id].chid].name;
					// If character is not part of the selected characters and has been deleted
					else this_edit_mes_chname = chat[this_edit_mes_id].name;
				}
			}

			text = text.trim();
			const mesText = root.find(".mes_text");

			let edit_textarea = $("<textarea class=edit_textarea>" + text + "</textarea>");
			mesText.append(edit_textarea);

			edit_textarea.css("opacity", 0.0).transition({
				opacity: 1.0,
				duration: 0,
				easing: "",
				complete: function () {},
			});

			edit_textarea
				.height(0)
				.height(edit_textarea[0].scrollHeight)
				.trigger("focus")
				.on("keydown", function (e) {
					const key = e.key;

					if (e.ctrlKey && ["b", "i", "q"].includes(key.toLowerCase())) {
						e.preventDefault();
						let focused = document.activeElement;

						if (key.toLowerCase() === "b") {
							insertFormating(focused, "**", "bold");
						} else if (key.toLowerCase() == "i") {
							insertFormating(focused, "*", "italic");
						} else if (key.toLowerCase() == "q") {
							insertFormating(focused, '"', "quote");
						}
					}
				});

			edit_textarea[0].setSelectionRange(
				edit_textarea.val().length,
				edit_textarea.val().length,
			);

			if (this_edit_mes_id == count_view_mes - 1 || true) {
				//console.log(1);
				$("#chat").scrollTop(chatScrollPosition);
			}
		}
	});

	$(document).on("click", ".mes_edit_clone", function () {
		if (!confirm("Make a copy of this message?")) {
			return;
		}
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		let oldScroll = $("#chat")[0].scrollTop;
		let clone = JSON.parse(JSON.stringify(chat[this_edit_mes_id]));
		clone.send_date++;

		let nameSelect = root.find(".name_select");
		let authorId = parseInt(nameSelect.val());
		clone.is_user = authorId < 0;
		clone.chid = authorId < 0 ? undefined : authorId;
		clone.name = authorId < 0 ? name1 : Characters.id[authorId].name;
		clone.mes = root.find(".mes_text").children(".edit_textarea").val().trim();

		chat.splice(this_edit_mes_id + 1, 0, clone);
		root.after(addOneMessage(clone));
		recalculateChatMesids();
		if (!is_room) {
			saveChat();
		} else {
			Rooms.setActiveCharacterId(chat);
			saveChatRoom();
		}
		$("#chat")[0].scrollTop = oldScroll;
	});

	$(document).on("click", ".mes_edit_delete", function () {
		if (!confirm("Are you sure you want to delete this message?")) {
			return;
		}
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		chat.splice(this_edit_mes_id, 1);
		this_edit_target_id = undefined;
		this_edit_mes_id = undefined;
		root.remove();
		count_view_mes--;
		recalculateChatMesids();
		if (!is_room) {
			saveChat();
		} else {
			Rooms.setActiveCharacterId(chat);
			saveChatRoom();
		}
		hideSwipeButtons();
		showSwipeButtons();
	});

	$(document).on("click", ".mes_up", function () {
		if (this_edit_mes_id <= 0 && this_edit_target_id === undefined) {
			return;
		}
		this_edit_mes_id = parseInt(this_edit_mes_id);
		if (this_edit_target_id === undefined) {
			this_edit_target_id = this_edit_mes_id - 1;
		} else {
			this_edit_target_id--;
		}
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		root.attr("mesid", this_edit_target_id);
		root.prev().attr("mesid", this_edit_target_id + 1);
		root.insertBefore(root.prev());
		$(this)
			.parent()
			.children(".mes_up")
			.attr("class", this_edit_target_id == 0 ? "mes_up disabled" : "mes_up");
		$(this)
			.parent()
			.children(".mes_down")
			.attr(
				"class",
				this_edit_target_id == chat.length - 1 ? "mes_down disabled" : "mes_down",
			);
	});

	$(document).on("click", ".mes_down", function () {
		if (this_edit_mes_id >= chat.length - 1 && this_edit_target_id === undefined) {
			return;
		}
		this_edit_mes_id = parseInt(this_edit_mes_id);
		if (this_edit_target_id === undefined) {
			this_edit_target_id = this_edit_mes_id + 1;
		} else {
			this_edit_target_id++;
		}
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		root.attr("mesid", this_edit_target_id);
		root.next().attr("mesid", this_edit_target_id - 1);
		root.insertAfter(root.next());
		$(this)
			.parent()
			.children(".mes_up")
			.attr("class", this_edit_target_id == 0 ? "mes_up disabled" : "mes_up");
		$(this)
			.parent()
			.children(".mes_down")
			.attr(
				"class",
				this_edit_target_id == chat.length - 1 ? "mes_down disabled" : "mes_down",
			);
	});

	$(document).on("change", ".name_select", function () {
		const root = messageRoot($(this));
		if (!root) {
			return;
		}
		let to_chid = parseInt($(this).val());
		// let toAvatar = to_chid < 0 ? "User Avatars/" + user_avatar : "characters/" + Characters.id[to_chid].filename;
		let toAvatar;

		if (to_chid >= 0) toAvatar = "characters/" + Characters.id[to_chid].filename;
		else if (to_chid == -1) toAvatar = "User Avatars/" + user_avatar;
		else toAvatar = undefined;

		root.find(".avt_img").attr("src", toAvatar + "#t=" + Date.now());
	});

	$(document).on("click", ".mes_edit_cancel", function () {
		hideSwipeButtons();
		const mes = chat[this_edit_mes_id];
		const text = mes.mes;

		const root = messageRoot($(this));
		if (!root) return;

		toggleEdit(root, false);

		root.find(".avt_img").attr("src", getMessageAvatar(mes, Date.now()));
		let nameSelect = root.find(".name_select");
		nameSelect.empty();
		nameSelect.css("display", "none");

		root.find(".ch_name").css("display", "block");
		root.find(".mes_text").empty();
		root.find(".mes_text").append(messageFormating(text, this_edit_mes_chname));

		if (
			this_edit_target_id !== undefined &&
			this_edit_target_id !== null &&
			this_edit_target_id !== this_edit_mes_id
		) {
			$("#chat")[0].insertBefore(
				$("#chat")[0].childNodes[this_edit_target_id],
				$("#chat")[0].childNodes[
					this_edit_mes_id < this_edit_target_id ? this_edit_mes_id : this_edit_mes_id + 1
				],
			);
			recalculateChatMesids();
		}
		this_edit_target_id = undefined;
		this_edit_mes_id = undefined;

		showSwipeButtons();
		addHeaderAndCopyToCodeBlock(root);
	});

	$(document).on("click", ".mes_edit_done", function () {
		showSwipeButtons();
		messageEditDone($(this));
	});

	function messageEditDone(div) {
		const root = messageRoot(div);
		if (!root) return;

		hideSwipeButtons();
		var text = root.find(".mes_text").children(".edit_textarea").val();
		const message = chat[this_edit_mes_id];
		text = text.trim();
		message.mes = text;

		let nameSelect = root.find(".name_select");
		let authorId = parseInt(nameSelect.val());

		// message.is_user = authorId < 0;
		message.is_user = authorId == -1;
		// message.chid = authorId < 0 ? undefined : authorId;
		message.chid = authorId == -1 ? undefined : authorId; // -1 is user, higher denotes characters, lower denotes characters that's deleted
		// message.name = authorId < 0 ? name1 : Characters.id[authorId].name;
		if (authorId >= 0) message.name = Characters.id[authorId].name;
		else if (authorId == -1) message.name = name1;
		// If authorId < -1, then character has chatted (in the room), but is no longer a part of the selected characters and has been deleted

		nameSelect.empty();
		nameSelect.css("display", "none");
		let chName = root.find(".ch_name");
		chName.html(message.name);
		chName.css("display", "block");

		if (message["swipe_id"] !== undefined) {
			message["swipes"][message["swipe_id"]] = text;
		}
		root.find(".mes_text").empty();
		toggleEdit(root, false);

		const message_formated = messageFormating(text, this_edit_mes_chname);

		root.find(".mes_text").append(message_formated);
		root.find(".token_counter").html(getTokenCount(text));

		if (this_edit_target_id !== undefined && this_edit_target_id !== this_edit_mes_id) {
			let date = message.send_date;
			chat.splice(this_edit_target_id, 0, chat.splice(this_edit_mes_id, 1)[0]);

			if (this_edit_target_id < this_edit_mes_id) {
				for (let i = this_edit_target_id; i < this_edit_mes_id; i++) {
					chat[i].send_date = chat[i + 1].send_date;
				}
				message.send_date = date;
			} else {
				for (let i = this_edit_target_id; i > this_edit_mes_id; i--) {
					chat[i].send_date = chat[i - 1].send_date;
				}
				message.send_date = date;
			}

			for (let i = 0; i < div.parent().parent().parent().parent().children().length; i++) {
				div.parent().parent().parent().parent().children().eq(i).attr("mesid", i);
			}
		}

		addHeaderAndCopyToCodeBlock(root);
		showSwipeButtons();

		this_edit_target_id = undefined;
		this_edit_mes_id = undefined;

		if (!is_room) {
			saveChat();
		} else {
			Rooms.setActiveCharacterId(chat);
			saveChatRoom();
		}
	}

	//********************
	$("#openai_stream").on("change", function (e) {
		if (main_api === "openai") openai_stream = e.currentTarget.checked;
		else if (main_api === "proxy") proxy_stream = e.currentTarget.checked;

		saveSettingsDebounce();
	});

	$("#openai_enhance_definitions").on("change", function (e) {
		if (main_api === "openai") openai_enhance_definitions = e.currentTarget.checked;
		else if (main_api === "proxy") proxy_enhance_definitions = e.currentTarget.checked;

		saveSettingsDebounce();
	});

	$("#openai_send_jailbreak").on("change", function (e) {
		if (main_api === "openai") openai_send_jailbreak = e.currentTarget.checked;
		else if (main_api === "proxy") proxy_send_jailbreak = e.currentTarget.checked;

		saveSettingsDebounce();
	});

	$("#openai_nsfw_encouraged").on("change", function (e) {
		if (main_api === "openai") openai_nsfw_encouraged = e.currentTarget.checked;
		else if (main_api === "proxy") proxy_nsfw_encouraged = e.currentTarget.checked;

		saveSettingsDebounce();
	});

	$("#openai_nsfw_prioritized").on("change", function (e) {
		if (main_api === "openai") openai_nsfw_prioritized = e.currentTarget.checked;
		else if (main_api === "proxy") proxy_nsfw_prioritized = e.currentTarget.checked;

		saveSettingsDebounce();
	});

	$(document).on("click", ".swipe_right", function () {
		const swipe_duration = 120;
		const swipe_range = "700px";
		let run_generate = false;
		let run_swipe_right = false;

		if (chat[chat.length - 1]["swipe_id"] === undefined) {
			chat[chat.length - 1]["swipe_id"] = 0;
			chat[chat.length - 1]["swipes"] = [];
			chat[chat.length - 1]["swipes"][0] = chat[chat.length - 1]["mes"];
		}

		chat[chat.length - 1]["swipe_id"]++;

		const swipe_count = chat[chat.length - 1]["swipes"].length;
		const current_count = chat[chat.length - 1]["swipe_id"] + 1;

		$(this).children(".swipe_counter").text(`${current_count} / ${swipe_count}`);

		if (
			parseInt(chat[chat.length - 1]["swipe_id"]) === chat[chat.length - 1]["swipes"].length
		) {
			run_generate = true;
		} else if (
			parseInt(chat[chat.length - 1]["swipe_id"]) < chat[chat.length - 1]["swipes"].length
		) {
			chat[chat.length - 1]["mes"] =
				chat[chat.length - 1]["swipes"][chat[chat.length - 1]["swipe_id"]];
			run_swipe_right = true;
		}

		if (chat[chat.length - 1]["swipe_id"] > chat[chat.length - 1]["swipes"].length) {
			chat[chat.length - 1]["swipe_id"] = chat[chat.length - 1]["swipes"].length;
		}

		if (run_generate) {
			$(this).css("display", "none");
		}

		if (run_generate || run_swipe_right) {
			let this_mes_div = $(this).parent();
			let this_mes_block = $(this).parent().children(".mes_block").children(".mes_text");
			const this_mes_div_height = this_mes_div[0].scrollHeight;
			this_mes_div.css("height", this_mes_div_height);
			const this_mes_block_height = this_mes_block[0].scrollHeight;

			this_mes_div.children(".swipe_left").css("display", "block");
			this_mes_div.children(".mes_block").transition({
				x: "-" + swipe_range,
				duration: swipe_duration,
				easing: animation_rm_easing,
				queue: false,
				complete: function () {
					const is_animation_scroll =
						$("#chat").scrollTop() >=
						$("#chat").prop("scrollHeight") - $("#chat").outerHeight() - 10;

					if (
						run_generate &&
						parseInt(chat[chat.length - 1]["swipe_id"]) ===
							chat[chat.length - 1]["swipes"].length
					) {
						$("#chat")
							.children()
							.filter('[mesid="' + (count_view_mes - 1) + '"]')
							.children(".mes_block")
							.children(".mes_text")
							.html("...");

						$("#chat")
							.children()
							.filter('[mesid="' + (count_view_mes - 1) + '"]')
							.children(".token_counter")
							.html("-");
					} else {
						addOneMessage(chat[chat.length - 1], "swipe");
					}

					let new_height =
						this_mes_div_height -
						(this_mes_block_height - this_mes_block[0].scrollHeight);
					if (new_height < 103) new_height = 103;

					this_mes_div.animate(
						{ height: new_height + "px" },
						{
							duration: 100,
							queue: false,
							progress: function () {
								// Scroll the chat down as the message expands
								if (is_animation_scroll)
									$("#chat").scrollTop($("#chat")[0].scrollHeight);
							},
							complete: function () {
								this_mes_div.css("height", "auto");
								// Scroll the chat down to the bottom once the animation is complete
								if (is_animation_scroll)
									$("#chat").scrollTop($("#chat")[0].scrollHeight);
							},
						},
					);

					this_mes_div.children(".mes_block").transition({
						x: swipe_range,
						duration: 0,
						easing: animation_rm_easing,
						queue: false,
						complete: function () {
							this_mes_div.children(".mes_block").transition({
								x: "0px",
								duration: swipe_duration,
								easing: animation_rm_easing,
								queue: false,
								complete: function () {
									if (
										run_generate &&
										!Tavern.is_send_press &&
										parseInt(chat[chat.length - 1]["swipe_id"]) ===
											chat[chat.length - 1]["swipes"].length
									) {
										Tavern.is_send_press = true;
										Generate("swipe");
									} else {
										if (
											parseInt(chat[chat.length - 1]["swipe_id"]) !==
											chat[chat.length - 1]["swipes"].length
										) {
											if (!is_room) saveChat();
											else saveChatRoom();
										}
									}
								},
							});
						},
					});
				},
			});

			$(this)
				.parent()
				.children(".avatar")
				.transition({
					x: "-" + swipe_range,
					duration: swipe_duration,
					easing: animation_rm_easing,
					queue: false,
					complete: function () {
						$(this)
							.parent()
							.children(".avatar")
							.transition({
								x: swipe_range,
								duration: 0,
								easing: animation_rm_easing,
								queue: false,
								complete: function () {
									$(this)
										.parent()
										.children(".avatar")
										.transition({
											x: "0px",
											duration: swipe_duration,
											easing: animation_rm_easing,
											queue: false,
											complete: function () {},
										});
								},
							});
					},
				});
		}
	});

	$(document).on("click", ".swipe_left", function () {
		const current_chat = chat[chat.length - 1];

		const swipe_duration = 120;
		const swipe_range = "700px";

		current_chat["swipe_id"]--;

		const swipe_count = current_chat["swipes"].length;
		const current_count = current_chat["swipe_id"] + 1;

		$(this).parent().find(".swipe_counter").text(`${current_count} / ${swipe_count}`);

		if (current_chat["swipe_id"] >= 0) {
			$(this).parent().children(".swipe_right").css("display", "block");

			if (current_chat["swipe_id"] === 0) {
				$(this).css("display", "none");
			}

			let this_mes_div = $(this).parent();
			let this_mes_block = $(this).parent().children(".mes_block").children(".mes_text");

			const this_mes_div_height = this_mes_div[0].scrollHeight;
			this_mes_div.css("height", this_mes_div_height);
			const this_mes_block_height = this_mes_block[0].scrollHeight;

			current_chat["mes"] = current_chat["swipes"][current_chat["swipe_id"]];

			$(this)
				.parent()
				.children(".mes_block")
				.transition({
					x: swipe_range,
					duration: swipe_duration,
					easing: animation_rm_easing,
					queue: false,
					complete: function () {
						const is_animation_scroll =
							$("#chat").scrollTop() >=
							$("#chat").prop("scrollHeight") - $("#chat").outerHeight() - 10;

						addOneMessage(current_chat, "swipe");

						let new_height =
							this_mes_div_height -
							(this_mes_block_height - this_mes_block[0].scrollHeight);
						if (new_height < 103) new_height = 103;

						this_mes_div.animate(
							{ height: new_height + "px" },
							{
								duration: 100,
								queue: false,
								progress: function () {
									// Scroll the chat down as the message expands

									if (is_animation_scroll)
										$("#chat").scrollTop($("#chat")[0].scrollHeight);
								},
								complete: function () {
									this_mes_div.css("height", "auto");
									// Scroll the chat down to the bottom once the animation is complete
									if (is_animation_scroll)
										$("#chat").scrollTop($("#chat")[0].scrollHeight);
								},
							},
						);

						$(this)
							.parent()
							.children(".mes_block")
							.transition({
								x: "-" + swipe_range,
								duration: 0,
								easing: animation_rm_easing,
								queue: false,
								complete: function () {
									$(this)
										.parent()
										.children(".mes_block")
										.transition({
											x: "0px",
											duration: swipe_duration,
											easing: animation_rm_easing,
											queue: false,
											complete: function () {
												if (!is_room) saveChat();
												else saveChatRoom();
											},
										});
								},
							});
					},
				});

			$(this)
				.parent()
				.children(".avatar")
				.transition({
					x: swipe_range,
					duration: swipe_duration,
					easing: animation_rm_easing,
					queue: false,
					complete: function () {
						$(this)
							.parent()
							.children(".avatar")
							.transition({
								x: "-" + swipe_range,
								duration: 0,
								easing: animation_rm_easing,
								queue: false,
								complete: function () {
									$(this)
										.parent()
										.children(".avatar")
										.transition({
											x: "0px",
											duration: swipe_duration,
											easing: animation_rm_easing,
											queue: false,
											complete: function () {},
										});
								},
							});
					},
				});
		}

		if (chat[chat.length - 1]["swipe_id"] < 0) {
			chat[chat.length - 1]["swipe_id"] = 0;
		}
	});

	$("#your_name_button").on("click", function () {
		if (!Tavern.is_send_press) {
			name1 = $("#your_name").val();
			if (name1 === undefined || name1 == "") name1 = default_user_name;

			$(".mes").each(function () {
				if ($(this).attr("is_user") === "true") {
					$(this).find(".ch_name").text(name1);
				}
			});
			saveSettings();
		}
	});

	$("#your_avatar_add_button").on("click", function () {
		$("#user_avatar_add_file").trigger("click");
	});

	$("#user_avatar_add_file").on("change", function (e) {
		var file = e.target.files[0];
		//console.log(1);
		if (!file) {
			return;
		}

		//console.log(format);
		var formData = new FormData($("#form_add_user_avatar").get(0));

		jQuery.ajax({
			type: "POST",
			url: "/adduseravatar",
			data: formData,
			beforeSend: function () {
				//$('#create_button').attr('disabled',true);
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			contentType: false,
			processData: false,
			success: function (data) {
				getUserAvatars();
			},
			error: function (jqXHR, exception) {
				//let error = handleError(jqXHR);
				callPopup(exception, "alert_error");
			},
		});
	});

	$(document).on("click", ".user_avatar_cross", function () {
		delete_user_avatar_filename = $(this).parent().attr("imgfile");
		callPopup("<h3>Delete this avatar?</h3>", "delete_user_avatar");
	});

	//Select chat
	async function getAllCharaChats() {
		$("#select_chat_div").html("");
		//console.log(Characters.id[Characters.selectedID].chat);
		jQuery.ajax({
			type: "POST",
			url: "/getallchatsofchatacter",
			data: JSON.stringify({ filename: Characters.id[Characters.selectedID].filename }),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {
				$("#load_select_chat_div").css("display", "none");
				let dataArr = Object.values(data);
				data = dataArr.sort((a, b) => a["file_name"].localeCompare(b["file_name"]));
				data = data.reverse();
				for (const key in data) {
					let strlen = 340;
					let mes = data[key]["mes"];

					if (mes.length > strlen) {
						mes = "..." + mes.substring(mes.length - strlen);
					}

					mes += `<span style="opacity:0.3">(${TavernDate(
						data[key]["mes_send_date"],
					)})</span>`;

					let delete_chat_div = `<div class="chat_delete" style="width: 80px;"><a href="#">Delete</a></div>`;

					if (
						Number(Characters.id[Characters.selectedID].chat) ===
						Number(data[key]["file_name"].split(".")[0])
					) {
						delete_chat_div = "";
					}

					let this_chat_name = getChatNameHtml(
						data[key]["file_name"],
						data[key]["chat_name"],
					);

					$("#select_chat_div").append(
						`<div class="select_chat_block" file_name="` +
							data[key]["file_name"] +
							`"><div class=avatar><img src="characters/` +
							Characters.id[Characters.selectedID].filename +
							`"></div><div class="select_chat_block_filename"><div class="select_chat_block_filename_text">` +
							this_chat_name +
							`</div> <button class="rename" title="Change name"></button></div><div class="select_chat_block_mes">` +
							vl(mes) +
							`</div><div class="chat_export"><a href="#">Export</a></div><div>` +
							delete_chat_div +
							`</div></div><hr>`,
					);

					if (
						Characters.id[Characters.selectedID]["chat"] ==
						data[key]["file_name"].replace(".jsonl", "")
					) {
						//children().last()
						$("#select_chat_div")
							.children(":nth-last-child(1)")
							.attr("highlight", true);
					}
				}
				//<div id="select_chat_div">

				//<div id="load_select_chat_div">
				//console.log(data);
				//chat.length = 0;

				//chat =  data;
				//getChatResult();
				//saveChat();
			},
			error: function (jqXHR, exception) {
				//getChatResult();
				console.log(exception);
				console.log(jqXHR);
			},
		});
	}

	$("#select_chat_popup").on("click", ".chat_export", function (e) {
		e.stopPropagation();
		let chat_file = $(this).parent().attr("file_name");
		$.get(
			`../chats/${Characters.id[Characters.selectedID].filename.replace(
				`.${characterFormat}`,
				"",
			)}/${chat_file}`,
			function (data) {
				let blob = new Blob([data], { type: "application/json" });
				let url = URL.createObjectURL(blob);
				let $a = $("<a>")
					.attr("href", url)
					.attr("download", `${Characters.id[Characters.selectedID].name}_${chat_file}`);
				$("body").append($a);
				$a[0].click();
				$a.remove();
			},
		);
	});

	$("#select_chat_popup").on("click", ".rename", function (e) {
		e.stopPropagation();

		let chat_file = $(this).parent().parent().attr("file_name");
		let old_name_prompt;
		if (chat_file != $(this).parent().children(".select_chat_block_filename_text").text()) {
			old_name_prompt = $.trim(
				$(this)
					.parent()
					.children(".select_chat_block_filename_text")
					.html()
					.split("<span")[0]
					.replace("<u>", "")
					.replace("</u>", ""),
			);
		}
		let this_chat_name = prompt("Please enter the chat name:", old_name_prompt);
		if (this_chat_name === null) {
			// User clicked cancel
		} else if (this_chat_name === "") {
			// User entered empty text
			chat_name = undefined;
			setChatName(chat_file);
		} else {
			// User entered non-empty text
			chat_name = this_chat_name;
			setChatName(chat_file);
		}
	});

	function setChatName(chat_file) {
		jQuery.ajax({
			type: "POST",
			url: "/changechatname",
			data: JSON.stringify({
				character_filename: Characters.id[Characters.selectedID].filename,
				chat_filename: chat_file.split(".")[0],
				chat_name: chat_name,
			}),
			beforeSend: function () {
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			dataType: "json",
			contentType: "application/json",
			success: function (data) {
				let $chatBlock = $(`.select_chat_block[file_name="${chat_file}"]`);
				if ($chatBlock.length) {
					$chatBlock
						.find(".select_chat_block_filename_text")
						.html(getChatNameHtml(chat_file, chat_name));
				}
			},
			error: function (jqXHR, exception) {
				console.log(exception);
				console.log(jqXHR);
				callPopup(exception, "alert_error");
			},
		});
	}

	function getChatNameHtml(chat_file, chat_name) {
		let this_chat_name;
		if (chat_name != undefined) {
			this_chat_name = chat_name;
		} else {
			this_chat_name = chat_file;
		}
		if (chat_file.split(".")[0] == Characters.id[Characters.selectedID].chat) {
			this_chat_name = `<u>${this_chat_name}</u>`;
		}
		if (chat_name != undefined) {
			this_chat_name = `${this_chat_name} <span style="font-size:0.8em;opacity:0.3">(${chat_file})</span>`;
		}

		return vl(this_chat_name);
	}

	$("#select_chat_popup").on("click", ".chat_delete", function (e) {
		e.stopPropagation();
		let $patent = $(this).parent();
		let chat_file = $(this).parent().attr("file_name");
		data_delete_chat = {
			chat_file: chat_file,
			character_filename: Characters.id[Characters.selectedID].filename.replace(
				`.${characterFormat}`,
				"",
			),
		};
		callPopup("<h3>Delete this chat?</h3>", "delete_chat");
	});

	//************************************************************
	//************************Novel.AI****************************
	//************************************************************
	async function getStatusNovel() {
		if (is_get_status_novel) {
			var data = { key: api_key_novel };

			jQuery.ajax({
				type: "POST", //
				url: "/getstatus_novelai", //
				data: JSON.stringify(data),
				beforeSend: function () {
					//$('#create_button').attr('value','Creating...');
				},
				cache: false,
				timeout: requestTimeout,
				dataType: "json",
				contentType: "application/json",
				success: function (data) {
					if (data.error != true) {
						//var settings2 = JSON.parse(data);
						//const getData = await response.json();
						novel_tier = data.tier;
						if (novel_tier == undefined) {
							online_status = "no_connection";
						}
						if (novel_tier === 0) {
							online_status = "Paper";
						}
						if (novel_tier === 1) {
							online_status = "Tablet";
						}
						if (novel_tier === 2) {
							online_status = "Scroll";
						}
						if (novel_tier === 3) {
							online_status = "Opus";
						}
					} else {
						callPopup(data.error_message, "alert_error");
					}
					setPygmalionFormating();
					resultCheckStatusNovel();
				},
				error: function (jqXHR, exception) {
					online_status = "no_connection";
					console.log(exception);
					console.log(jqXHR);
					resultCheckStatusNovel();
				},
			});
		} else {
			if (is_get_status != true && !is_get_status_openai) {
				online_status = "no_connection";
			}
		}
	}

	$("#api_button_novel").on("click", function () {
		if ($("#api_key_novel").val() != "") {
			$("#api_loading_novel").css("display", "inline-block");
			$("#api_button_novel").css("display", "none");
			api_key_novel = $("#api_key_novel").val();
			api_key_novel = $.trim(api_key_novel);
			//console.log("1: "+api_server);
			saveSettings();
			is_get_status_novel = true;
			is_api_button_press_novel = true;
		}
	});

	function resultCheckStatusNovel() {
		is_api_button_press_novel = false;
		checkOnlineStatus();
		$("#api_loading_novel").css("display", "none");
		$("#api_button_novel").css("display", "inline-block");
	}

	$("#model_novel_select").on("change", function () {
		model_novel = $("#model_novel_select").find(":selected").val();
		saveSettingsDebounce();
	});

	$("#model_openai_select").on("change", function () {
		if (main_api === "openai") {
			model_openai = $("#model_openai_select").find(":selected").val();
		} else if (main_api === "proxy") {
			model_proxy = $("#model_openai_select").find(":selected").val();
		}

		openAIChangeMaxContextForModels();
		saveSettingsDebounce();
	});

	function openAIChangeMaxContextForModels() {
		let this_openai_max_context;
		let this_model = main_api === "openai" ? model_openai : model_proxy;

		switch (this_model) {
			case "gpt-4":
				this_openai_max_context = 8192;
				break;

			case "gpt-4-32k":
				this_openai_max_context = 32768;
				break;

			case "gpt-3.5-turbo-16k":
				this_openai_max_context = 16384;
				break;

			case "claude-v1":
			case "claude-v1.3":
			case "claude-v1.2":
			case "claude-v1.0":

			case "claude-instant-v1":
			case "claude-instant-v1.1":
			case "claude-instant-v1.0":
				this_openai_max_context = 7500;
				break;

			case "claude-v1-100k":
			case "claude-v1.3-100k":
			case "claude-v1.2-100k":
			case "claude-v1.0-100k":

			case "claude-instant-v1.1-100k":
			case "claude-instant-v1.0-100k":
			case "claude-instant-v1-100k":
				this_openai_max_context = 99000;
				break;

			case "code-davinci-002":
				this_openai_max_context = 8000;
				break;

			case "text-curie-001":
			case "text-babbage-001":
			case "text-ada-001":
				this_openai_max_context = 2049;
				break;

			default:
				this_openai_max_context = 4096;
				break;
		}

		$("#max_context_openai").attr("max", this_openai_max_context);

		if (main_api === "openai") {
			if (max_context_openai > this_openai_max_context) {
				max_context_openai = this_openai_max_context;
			}

			$("#max_context_openai").val(max_context_openai);
			$("#max_context_counter_openai").html(max_context_openai);
		} else if (main_api === "proxy") {
			if (max_context_proxy > this_openai_max_context) {
				max_context_proxy = this_openai_max_context;
			}

			$("#max_context_openai").val(max_context_proxy);
			$("#max_context_counter_openai").html(max_context_proxy);
		}
	}

	$("#kobold_set_context_size_button").click(function () {
		let number = prompt("Please enter a context size:");
		if (number !== null) {
			number = parseFloat(number);
			if (!isNaN(number)) {
				max_context = number;
				$("#max_context").val(max_context);
				$("#max_context_counter").html(max_context + " Tokens");
				saveSettings();
			} else {
				alert("Invalid input. Please enter a valid number.");
			}
		}
	});

	$("#anchor_order").on("change", function () {
		anchor_order = parseInt($("#anchor_order").find(":selected").val());
		saveSettingsDebounce();
	});

	$("#pygmalion_formating").on("change", function () {
		pygmalion_formating = parseInt($("#pygmalion_formating").find(":selected").val());
		setPygmalionFormating();
		checkOnlineStatus();
		saveSettingsDebounce();
	});

	//************************************************************
	//************************OPENAI****************************
	//************************************************************
	async function getStatusOpenAI() {
		if (is_get_status_openai) {
			const controller = new AbortController();

			let this_api_key;
			if (main_api === "openai") {
				this_api_key = api_key_openai;
			} else if (main_api === "proxy") {
				this_api_key = api_key_proxy;
			}

			const data = { key: this_api_key, url: $("#api_url_openai").val() };

			await fetch("/getstatus_openai", {
				method: "POST",
				body: JSON.stringify(data),
				cache: "no-cache",
				signal: controller.signal,
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": token,
				},
			})
				.then(async (res) => {
					const resJson = await res.json();
					online_status = resJson.success ? "Connected" : "no_connection";

					setPygmalionFormating();
					resultCheckStatusOpen();

					if (!resJson.success) {
						console.log(resJson);
						if (resJson.message) callPopup(resJson.message, "alert_error");

						return;
					}
					getStatusOpenAIDebounce();

					if (main_api === "proxy" && is_need_load_models_proxy) {
						is_need_load_models_proxy = false;

						$("#model_openai_select").empty();
						if (!resJson.models.length) {
							$("#model_openai_select").append(
								$("<option>", {
									text: "No models found.",
									disabled: "disabled",
								}),
							);
						}

						let is_mode_exist = false;
						if (
							resJson.models.length === 2 &&
							resJson.models[0].id === "gpt-3.5-turbo"
						) {
							const models = [...resJson.models, { id: "gpt-3.5-turbo-16k" }];

							models.forEach(function (item, i) {
								if (model_proxy === item.id) is_mode_exist = true;
								$("#model_openai_select").append(
									$("<option>", {
										value: item.id,
										text: item.id,
									}),
								);
							});
						} else {
							resJson.models.forEach(function (item, i) {
								if (model_proxy === item.id) is_mode_exist = true;
								$("#model_openai_select").append(
									$("<option>", {
										value: item.id,
										text: item.id,
									}),
								);
							});
						}

						if (!is_mode_exist) {
							model_proxy = "gpt-3.5-turbo";
						}

						$("#model_openai_select").val(model_proxy);
					}
				})
				.catch((err) => {
					console.error("🚀 ~ file: script.js ~ getStatusOpenAI ~ err:", err);
					online_status = "no_connection";

					if (!controller.signal.aborted) {
						callPopup(Error(err).message, "alert_error");
					}

					resultCheckStatus();
				});

			return;
		}

		if (!is_get_status_openai && !is_get_status) {
			online_status = "no_connection";
		}
	}

	$("#api_button_openai").on("click", function () {
		if (main_api === "openai") {
			api_key_openai = $("#api_key_openai").val().trim();
			api_url_openai = default_api_url_openai;
		}

		if (main_api === "proxy") {
			api_key_proxy = $("#api_key_openai").val().trim();

			if ($("#api_url_openai").val()) {
				api_url_proxy = $("#api_url_openai").val().trim();
			}
		}

		$("#api_loading_openai").css("display", "inline-block");
		$("#api_button_openai").css("display", "none");

		saveSettingsDebounce();
		is_get_status_openai = true;
		is_api_button_press_openai = true;
		getStatusOpenAI();
	});

	function resultCheckStatusOpen() {
		is_api_button_press_openai = false;
		checkOnlineStatus();

		$("#api_loading_openai").css("display", "none");
		$("#api_button_openai").css("display", "inline-block");
	}

	function compareVersions(v1, v2) {
		const v1parts = v1.split(".");
		const v2parts = v2.split(".");

		for (let i = 0; i < v1parts.length; ++i) {
			if (v2parts.length === i) {
				return 1;
			}

			if (v1parts[i] === v2parts[i]) {
				continue;
			}
			if (v1parts[i] > v2parts[i]) {
				return 1;
			} else {
				return -1;
			}
		}

		if (v1parts.length != v2parts.length) {
			return -1;
		}

		return 0;
	}

	//**************************CHAT IMPORT EXPORT*************************//
	$("#chat_import_button").on("click", function () {
		$("#chat_import_file").trigger("click");
	});

	$("#chat_import_file").on("change", function (e) {
		var file = e.target.files[0];
		//console.log(1);
		if (!file) {
			return;
		}
		var ext = file.name.match(/\.(\w+)$/);
		if (
			!ext ||
			(ext[1].toLowerCase() != "json" &&
				ext[1].toLowerCase() != "jsonl" &&
				ext[1].toLowerCase() != "txt")
		) {
			return;
		}

		var format = ext[1].toLowerCase();
		$("#chat_import_file_type").val(format);
		var formData = new FormData($("#form_import_chat").get(0));
		formData.append("filename", Characters.id[Characters.selectedID].filename);
		jQuery.ajax({
			type: "POST",
			url: "/importchat",
			data: formData,
			beforeSend: function () {
				$("#select_chat_div").html("");
				$("#load_select_chat_div").css("display", "block");
				//$('#create_button').attr('value','Creating...');
			},
			cache: false,
			timeout: requestTimeout,
			contentType: false,
			processData: false,
			success: function (data) {
				//console.log(data);
				if (data.res) {
					getAllCharaChats();
				}
			},
			error: function (jqXHR, exception) {
				$("#create_button").removeAttr("disabled");
			},
		});
	});

	$(document).on("click", ".select_chat_block", function () {
		let file_name = $(this).attr("file_name").replace(".jsonl", "");
		//console.log(Characters.id[Characters.selectedID]['chat']);
		Characters.id[Characters.selectedID]["chat"] = file_name;
		clearChat();
		chat.length = 0;
		getChat();
		$("#selected_chat_pole").val(file_name);
		$("#create_button").trigger("click");
		$("#shadow_select_chat_popup").css("display", "none");
		$("#load_select_chat_div").css("display", "block");
	});

	$("#worldinfo-import").on("click", function () {
		$("#world_import_file").trigger("click");
	});

	//**************************************************************//
	//**************************************************************//
	//**************************************************************//
	//**************************************************************//
	//**************************CHARA CLOUD*************************//
	$("#chat_header_back_button").on("click", function () {
		if (charaCloud.isOnline()) {
			$("#shell").css("display", "none");
			$("#chara_cloud").css("display", "block");
			$("#chara_cloud").css("opacity", 0.0);
			$("#chara_cloud").transition({
				opacity: 1.0,
				duration: 300,
				queue: false,
				easing: "",
				complete: function () {},
			});

			$("#rm_button_characters").trigger("click");
			$("#bg_chara_cloud").transition({
				opacity: 1.0,
				duration: 1000,
				queue: false,
				easing: "",
				complete: function () {},
			});
		} else {
			Characters.selectedID = undefined;
			clearChat();
			chat.length = 0;
			chat = [chloeMes];
			name2 = "Chloe";
			$("#rm_button_characters").trigger("click");
			$("#rm_button_selected_ch").css("display", "none");
			$("#chat_header_char_name").text("");
			$("#chat_header_back_button").css("display", "none");
			$("#chat_header_char_info").text("Welcome to Tavern");
			printMessages();
			$("#chat").scrollTop(0);
		}
	});

	characloud_characters_rows = [];
	let charaCloudScroll = function () {
		const characters_row_scroll_container = $(this);
		const characters_row_container = characters_row_scroll_container.parent();

		const current_scroll_position = characters_row_scroll_container.scrollLeft();
		const max_scroll_posotion = characters_row_scroll_container[0].scrollLeftMax;

		const btn_swipe_rigth = characters_row_container.children(".characloud_swipe_rigth"),
			btn_swipe_left = characters_row_container.children(".characloud_swipe_left");

		characters_row_container.lazyLoadXT({ edgeX: 1000, edgeY: 500 });

		if (current_scroll_position === 0) {
			btn_swipe_left.transition({
				opacity: 0,
				duration: 250,
				easing: animation_rm_easing,
				queue: false,
				complete: function () {
					btn_swipe_left.css({ display: "none" });
				},
			});
		} else {
			btn_swipe_left.css({ display: "block" }).transition({
				opacity: 1,
				duration: 250,
				easing: animation_rm_easing,
				queue: false,
			});
		}

		if (current_scroll_position === max_scroll_posotion) {
			btn_swipe_rigth.transition({
				opacity: 0,
				duration: 250,
				easing: animation_rm_easing,
				queue: false,
				complete: function () {
					btn_swipe_rigth.css({ display: "none" });
				},
			});
		} else {
			btn_swipe_rigth.css({ display: "block" }).transition({
				opacity: 1,
				duration: 250,
				easing: animation_rm_easing,
				queue: false,
			});
		}
	};

	let charaCloudSwipeLeft = function () {
		const btn_swipe_left = $(this);

		const characters_row_container = btn_swipe_left.parent();
		const characters_row_scroll = characters_row_container.children(
			".characloud_characters_row_scroll",
		);

		const this_row_id = characters_row_container.attr("characloud_row_id");

		const current_scroll_position = characters_row_scroll.scrollLeft();

		let move_x = parseInt(characters_row_scroll.css("width")) / (is_mobile_user ? 2 : 4);

		characters_row_container.lazyLoadXT({ edgeX: 1000, edgeY: 500 });

		if (current_scroll_position === 0) {
			return characters_row_scroll.trigger("scroll");
		}

		characloud_characters_rows[this_row_id] = Math.max(current_scroll_position - move_x, 0);

		characters_row_scroll[0].scroll({
			left: characloud_characters_rows[this_row_id],
			behavior: "smooth",
		});
	};

	let charaCloudSwipeRight = function () {
		const btn_swipe_rigth = $(this);

		const characters_row_container = btn_swipe_rigth.parent();
		const characters_row_scroll = characters_row_container.children(
			".characloud_characters_row_scroll",
		);

		const this_row_id = characters_row_container.attr("characloud_row_id");

		const current_scroll_position = characters_row_scroll.scrollLeft();
		const max_scroll_posotion = characters_row_scroll[0].scrollLeftMax;

		let move_x = parseInt(characters_row_scroll.css("width")) / (is_mobile_user ? 1 : 3);

		characters_row_container.lazyLoadXT({ edgeX: 1000, edgeY: 500 });

		if (current_scroll_position === max_scroll_posotion) {
			return characters_row_scroll.trigger("scroll");
		}

		characloud_characters_rows[this_row_id] = Math.min(
			current_scroll_position + move_x,
			max_scroll_posotion,
		);

		characters_row_scroll[0].scroll({
			left: characloud_characters_rows[this_row_id],
			behavior: "smooth",
		});
	};

	$("#shell").on("click", "#chloe_star_dust_city", function () {
		showCharaCloud();
	});

	async function charaCloudInit() {
		charaCloud.is_init = true;
		charaCloudServerStatus();

		let characloud_characters_board = await charaCloud.getBoard();
		if (charaCloud.isOnline()) {
			if (login !== undefined && ALPHA_KEY !== undefined) {
				userLogin(login, ALPHA_KEY, "ALPHA_KEY");
			}
			//showCharaCloud();

			printCharactersBoard(characloud_characters_board);
		}
	}

	function printCharactersBoard(characloud_characters_board) {
		charaCloud
			.getCategories() // autocomplete
			.then(function (data) {
				const top_categories = data.sort((a, b) => b.count - a.count).slice(0, 10);
				$("#header_categories").html("");

				$("#header_categories").append(
					`<div class="category header-category" data-category="$categories">Categories</div>`,
				);
				$("#header_categories").append(
					`<div class="category header-category" data-category="$recent">Recent</div>`,
				);
				$("#header_categories").append(
					`<div class="category header-category" data-category="$random">Random</div>`,
				);
				top_categories.forEach(function (item, i) {
					$("#header_categories").append(
						`<div class="category header-category" data-category="${item.name}">${item.name} (${item.count})</div>`,
					);
				});
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});

		let char_i = 0;
		let row_i = 0;

		$("#characloud_characters").html("");
		characloud_characters_board.forEach(function (category, i) {
			if (category.characters.length === 0) return;

			characloud_characters_rows[row_i] = 0;
			$("#characloud_characters").append(
				`
				<div class="characloud_characters_category_container">
					<div category="${vl(category.name)}" class="characloud_characters_category_title">
						${vl(category.name_view.replace("$", ""))}
					</div>

					<div characloud_row_id="${row_i}" id="characloud_characters_row${row_i}" class="characloud_characters_row">
						<button class="characloud_swipe_rigth" type="button">
							<i class="fa-solid fa-caret-right fa-2xl"></i>
						</button>

						<button class="characloud_swipe_left" type="button">
							<i class="fa-solid fa-caret-left fa-2xl"></i>
						</button>
					</div>
				</div>
				`,
			);

			$("#characloud_characters_row" + row_i).append(
				`<div class="characloud_characters_row_scroll"> </div>`,
			);

			let row = $("#characloud_characters_row" + row_i);
			row[0].addEventListener("wheel", function (event) {
				if (!event.deltaX || row.sleeping) {
					return;
				}

				if (event.deltaX > 0) {
					row.sleeping = true;
					charaCloudSwipeRight.call(row.find(".characloud_swipe_rigth"));
				} else {
					row.sleeping = true;
					charaCloudSwipeLeft.call(row.find(".characloud_swipe_left"));
				}

				setTimeout(function () {
					row.sleeping = false;
				}, 150);
			});

			category.characters.forEach(function (item, i) {
				$("#characloud_characters_row" + row_i)
					.children(".characloud_characters_row_scroll")
					.append(charaCloud.getCharacterDivBlock(item, charaCloudServer));

				//$('#characloud_character_block'+char_i).children('.characloud_character_block_card').children('.avatar').children('img').lazyLoadXT({edgeX:500, edgeY:500});
				const $char_block = $(`.characloud_character_block[public_id="${item.public_id}"]`);
				//$.lazyLoadXT.scrollContainer = '#chara_cloud';

				const originalDesc = item.short_description
					.replace(/{{user}}/gi, name1)
					.replace(/{{char}}/gi, item.name)
					.replace(/<USER>/gi, name1)
					.replace(/<BOT>/gi, item.name);

				$char_block
					.find(".characloud_character_block_description")
					.attr("title", originalDesc)
					.text(originalDesc);

				characloud_characters[char_i] = item;
				char_i++;
			});

			row_i++;
		});

		$(".characloud_swipe_left").on("click", charaCloudSwipeLeft);
		$(".characloud_swipe_rigth").on("click", charaCloudSwipeRight);

		$(".characloud_characters_row_scroll")
			.on({
				scroll: charaCloudScroll,
				wheel: function (e) {
					const deltaY = e.originalEvent.deltaY,
						el = $(this);

					if (deltaY != 0) {
						const swipe_left_button = el.parent().children(".characloud_swipe_left");
						const swipe_right_button = el.parent().children(".characloud_swipe_rigth");

						const current_scroll_position = el.scrollLeft();
						const max_scroll_posotion = el[0].scrollLeftMax;

						if (
							deltaY < 0 &&
							swipe_left_button.css("display") !== "none" &&
							current_scroll_position > 0
						) {
							e.preventDefault();
							swipe_left_button.trigger("click");

							return;
						}

						if (
							deltaY > 0 &&
							swipe_right_button.css("display") !== "none" &&
							current_scroll_position < max_scroll_posotion
						) {
							e.preventDefault();
							swipe_right_button.trigger("click");

							return;
						}
					}
				},
			})
			.trigger("scroll");

		$(".lazy").lazyLoadXT({ edgeX: 500, edgeY: 500 });
		$("#characloud_bottom").css("display", "flex");
	}

	var is_lazy_load = true;
	$("#chara_cloud").on("scroll", function () {
		if (is_lazy_load) {
			is_lazy_load = false;
			setTimeout(lazy, 400);
		}
	});

	function lazy() {
		$(this).lazyLoadXT({ edgeX: 500, edgeY: 500 });
		is_lazy_load = true;
	}

	// Select character
	$("#chara_cloud").on("click", ".characloud_character_block_card", function () {
		let public_id = $(this).parent().attr("public_id");
		let public_id_short = $(this).parent().attr("public_id_short");
		let user_name = $(this).parent().attr("user_name");

		let img = $(this).find(".avatar");

		if (img.hasClass("nsfw_blur") && !img.attr("data-isAnimating")) {
			// Set 'isAnimating' data attribute as true
			img.attr("data-isAnimating", true)
				.addClass("show_nsfw")
				// Remove blur with transition effect
				.children("img")
				.transition({
					filter: "blur(0)",
					duration: 250,
					easing: "ease",
					complete: function () {
						// After the length of transition, remove class and mark animation done.
						img.removeClass("nsfw_blur")
							.removeAttr("data-isAnimating")
							.children("img")
							.css({ filter: "" });
					},
				});

			return;
		}

		charaCloudLoadCard(public_id, public_id_short, user_name);
	});

	$("#chara_cloud").on("click", ".characloud_character_block_page_link", function (event) {
		event.stopPropagation();

		const publicIdShort = $(this).attr("public_id_short");
		const userName = $(this).attr("user_name");
		const mode = $(this).attr("mode");
		selectCharacterCardOnline(userName, publicIdShort, mode);
	});

	$("#chara_cloud").on("click", ".characloud_character_block_user_name", function (event) {
		event.stopPropagation();
		showUserProfile($(this).attr("user_name"));
	});

	$("#chara_cloud").on("click", "#characloud_search_result .character_select", function () {
		if ($(this).attr("category") !== undefined) {
			showCategory($(this).attr("category"));
		} else {
			charaCloudLoadCard(
				$(this).attr("public_id"),
				$(this).attr("public_id_short"),
				$(this).attr("user_name"),
			);
		}
	});

	async function charaCloudLoadCard(public_id, public_id_short, user_name) {
		let need_to_load = true;
		let selected_char_id;
		Characters.id.forEach(function (item, i) {
			if (item.public_id != undefined) {
				if (item.public_id == public_id) {
					need_to_load = false;
					selected_char_id = i;
					return;
				}
			}
		});
		if (need_to_load) {
			await charaCloud.loadCard(user_name, public_id_short).then(
				(data) => {
					let id = Characters.getIDbyFilename(data.filename);
					if (id < 0) {
						Characters.addCharacter(data);
						Characters.onCharacterSelect({
							target: data.filename,
						});
					} else {
						Characters.onCharacterSelect({
							target: data.filename,
						});
					}
				},
				(error) => {
					console.error(error.status);
					switch (error.status) {
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				},
			);
			$("#shell").css("display", "grid");
			$("#chara_cloud").css("display", "none");
		} else {
			Characters.onCharacterSelect({
				target: Characters.id[selected_char_id].filename,
			});
			$("#shell").css("display", "grid");
			$("#chara_cloud").css("display", "none");
		}
		$("#bg_chara_cloud").transition({
			opacity: 0.0,
			duration: 1000,
			easing: "",
			complete: function () {},
		});
	}

	//search character
	$("#characloud_search_form").on("submit", async (event) => {
		hideAll();
		event.preventDefault(); // prevent default form submission
		// get search query from input field
		const searchQuery = $("#characloud_search").val().trim();
		let characloud_found_characters = [];
		let characloud_found_categories = [];
		let characloud_found_data = await charaCloud.searchCharacter(searchQuery);
		characloud_found_characters = characloud_found_data.characters;
		characloud_found_categories = characloud_found_data.categories;

		$("#characloud_search_block").css("display", "block");
		$("#characloud_search_back_button").css("display", "block");
		$("#characloud_characters").css("display", "none");
		$("#characloud_board").css("display", "none");
		$("#characloud_search_result").html("");

		characloud_found_characters.sort(function (a, b) {
			var nameA = a.name.toUpperCase(); // ignore upper and lowercase
			var nameB = b.name.toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}

			// names must be equal
			return 0;
		});
		characloud_found_categories.sort(function (a, b) {
			var nameA = a.name.toUpperCase(); // ignore upper and lowercase
			var nameB = b.name.toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}

			// names must be equal
			return 0;
		});
		if (characloud_found_categories.length > 0) {
			characloud_found_categories.forEach(function (item, i) {
				item.name = vl(item.name);
				item.name_view = vl(item.name_view);
				$("#characloud_search_result").append(
					`<div class="character_select" category="${item.name}"><div class=avatar></div><div style="color:rgb(168, 137, 97);" class="ch_name_menu">Category:</div><div class="ch_short_desctription">${item.name_view} (${item.count})</div></div>`,
				);
			});
		}
		if (characloud_found_characters.length > 0) {
			characloud_found_characters.forEach(function (item, i) {
				$("#characloud_search_result").append(
					'<div public_id_short="' +
						vl(item.public_id_short) +
						'" public_id="' +
						vl(item.public_id) +
						'" user_name="' +
						vl(item.user_name) +
						'" class=character_select chid=' +
						i +
						'><div class=avatar><img src="' +
						charaCloudServer +
						"/" +
						vl(item.user_name) +
						"/" +
						vl(item.public_id_short) +
						'.webp"></div><div class="ch_name_menu">' +
						vl(item.name) +
						'</div><div class="ch_short_desctription">' +
						vl(item.short_description) +
						"</div></div>",
				);
			});
		}
		if (characloud_found_characters.length === 0 && characloud_found_categories.length === 0) {
			$("#characloud_search_result").append("Characters not found");
		}
	});

	$("#characloud_search_back_button").on("click", function () {
		$("#characloud_search").val("");
		showMain();
	});

	if (document.getElementById("nav-toggle").checked) {
		is_nav_closed = true;
		$("#chara_cloud").transition({
			width: "calc(100vw - 610px)",
			duration: 140,
			delay: 20,
			easing: "ease-in-out",
			complete: function () {},
		});
	}

	$(".nav-toggle").on("click", function () {
		is_nav_closed = $("#nav-toggle").prop("checked");

		if (is_nav_closed) {
			if (is_mobile_user) {
				$("#chara_cloud").transition({
					width: "100vw",
					duration: 140,
					easing: "ease-in-out",
				});
			} else {
				$("#chara_cloud").transition({
					width: "100vw",
					paddingRight: "5rem",
					duration: 140,
					easing: "ease-in-out",
				});
			}
		} else {
			if (!is_mobile_user) {
				$("#chara_cloud").transition({
					paddingRight: "calc(2rem + 450px)",
					duration: 140,
					easing: "ease-in-out",
				});
			}
		}
	});

	async function charaCloudServerStatus() {
		let count_supply = 0;
		let max_supply = 30;
		let chara_logo = "default";
		let server_status = await charaCloud.getServerStatus();
		if (charaCloud.isOnline()) {
			count_supply = server_status.count_supply;
			max_supply = server_status.max_supply;
			use_reg_recaptcha = server_status.use_reg_recaptcha;
			if (server_status.chara_logo !== undefined) {
				if (server_status.chara_logo != "default") {
					chara_logo = server_status.chara_logo;
					$("#characloud_status_button_content_logo")
						.children("img")
						.attr("src", charaCloudServer + "/app/img/" + chara_logo + ".png");
				}
			}
			if (count_supply > max_supply) {
				count_supply = max_supply;
			}
			$("#characloud_status_button_content_logo_counter").text(
				count_supply + "/" + max_supply,
			);
			let inputNumber = count_supply / max_supply; // example input number
			if (inputNumber <= 0.5) {
				inputNumber = 0.01;
			} else {
				inputNumber -= 0.5;
				inputNumber *= 2;
			}
			const red = Math.round(255 - inputNumber * 55); // map inputNumber to red value
			const green = Math.round(180 + inputNumber * 75); // map inputNumber to green value
			//colorBox.style.backgroundColor = `rgba(${red}, ${green}, 200, 0.4)`;
			$("#characloud_status_button_content_logo_counter").css(
				"color",
				`rgba(${red}, ${green}, 200, 0.4)`,
			);
			$("#characloud_status_button_content_logo_line_fill").css(
				"background-color",
				`rgba(${red}, ${green}, 200, 0.5)`,
			);
			//if(count_supply >= max_supply){
			//$('#characloud_status_button_content_logo_counter').css('color', 'rgba(200,255,200,0.4)');
			//$('#characloud_status_button_content_logo_line_fill').css('background-color', 'rgba(200,255,200,0.5)');

			//}
			let fill_proportion = count_supply / max_supply;
			let fill_width = Math.floor(
				fill_proportion *
					parseInt(
						$("#characloud_status_button_content_logo_line_fill")
							.css("max-width")
							.replace("px", ""),
					),
			);
			$("#characloud_status_button_content_logo_line_fill").css("width", fill_width);
		} else {
			hideCharaCloud();
		}
	}

	//Login Registration
	$("#characloud_profile_button").on("click", function (event) {
		$("#successful_registration").css("display", "none");
		if (!is_login) {
			$("#reg_login_popup_shadow").css({ display: "block", opacity: 0 });
			$("#reg_login_popup_shadow").transition({
				opacity: 1.0,
				duration: animation_rm_duration,
				easing: animation_rm_easing,
				complete: function () {},
			});

			let rect = this.getBoundingClientRect();
			let xPosition = event.clientX - rect.left;
			let width = rect.right - rect.left;

			if (xPosition < width / 2.35) {
				switch_log_reg = "login";
				showLoginForm();
			} else {
				switch_log_reg = "reg";
				showRegForm();
			}
		} else {
			showUserProfile();
		}
	});

	setRegLoginFormSize();
	$(window).on("resize", function () {
		setRegLoginFormSize();
	});

	function setRegLoginFormSize() {
		// try {
		// 	let max_height = parseInt($("#reg_login_popup").css("max-height").replace("px", ""));
		// 	let windowHeight = $(window).height();
		// 	if (max_height > windowHeight) {
		// 		$("#reg_login_popup").height(windowHeight - 100);
		// 	} else {
		// 		$("#reg_login_popup").height(max_height);
		// 	}
		// } catch (err) {
		// 	console.log(err);
		// }
	}

	$("textarea.characloud_character").on("input", function (event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		textareaAutosize($(this));
	});

	$("#registration_form").on("submit", async (event) => {
		event.preventDefault(); // prevent default form submission
		if (use_reg_recaptcha) {
			grecaptcha.ready(function () {
				grecaptcha
					.execute("6Lf4za4lAAAAAKntV6fQX7daXJeWspwIN_bOBmwW", { action: "submit" })
					.then(function (re_token) {
						registration(re_token);
					});
			});
		} else {
			registration();
		}
	});

	function registration(re_token = undefined) {
		const username = $("#reg_username").val();
		const email = $("#reg_email").val();
		const password = $("#reg_password").val(); //$('#reg_password').val();
		const conf_password = $("#reg_confirm_password").val();
		$("#username_error").css("display", "none");
		$("#email_error").css("display", "none");
		$("#reg_password_error").css("display", "none");
		$("#reg_confirm_password_error").css("display", "none");

		charaCloud
			.registration(username, email, password, conf_password, re_token)
			.then(function (data) {
				$("#registration_form").css("display", "none");
				$("#successful_registration").css("display", "flex");
				$("#successful_registration").css("opacity", 0.0);
				$("#successful_registration").transition({
					opacity: 1.0,
					duration: 1000,
					easing: animation_rm_easing,
					complete: function () {
						setTimeout(userLogin(username, password, "password"), 1400);
					},
				});
			})
			.catch(function (error) {
				switch (error.status) {
					case 409: // Name already exists
						$("#username_error").css("display", "inline-block");
						$("#username_error").text("Name already exists");
						return;
					case 422:
						switch (error.msg) {
							case "Name validation error":
								$("#username_error").css("display", "inline-block");
								$("#username_error").text(
									"Name validation error. Only allowed A-Za-z0-9_",
								);
								return;
							case "Confirmation password does not match":
								$("#reg_confirm_password_error").css("display", "inline-block");
								$("#reg_confirm_password_error").text(error.msg);
								return;
							default:
								callPopup(`<h3>${error.msg}</h3>`, "alert_error");
								return;
						}
					case 504:
						callPopup(`${error.msg}`, "alert_error");
						return;
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
				console.log(error);
			});
	}

	$("#login_form").on("submit", async (event) => {
		event.preventDefault(); // prevent default form submission

		const username = $("#login_username").val();
		const password = $("#login_password").val(); //$('#reg_password').val();
		$("#login_username_error").css("display", "none");
		userLogin(username, password, "password");
	});

	function userLogin(username, password, type = "password") {
		charaCloud
			.login(username, password, type)
			.then(function (data) {
				if (type === "password") {
					ALPHA_KEY = data.ALPHA_KEY;
					login = data.username;
					login_view = data.username_view;
					setCookie("login_view", login_view, {
						"max-age": 31536000,
						secure: true,
						SameSite: "Lax",
					});
					setCookie("login", login, {
						"max-age": 31536000,
						secure: true,
						SameSite: "Lax",
					});
					setCookie("ALPHA_KEY", ALPHA_KEY, {
						"max-age": 31536000,
						secure: true,
						SameSite: "Lax",
					});
				}
				setCookie("refresh_login", "true", {
					"max-age": 600,
					secure: true,
					SameSite: "Lax",
				});
				if (type === "password") {
					showUserProfile();
				}
				$("#profile_button_is_not_login").css("display", "none");
				$("#profile_button_is_login").css("display", "block");

				$("#profile_button_is_login").children(".user_name").text(login_view);
				is_login = true;
			})
			.catch(function (error) {
				if (type === "password") {
					switch (error.status) {
						case 401: // Wrong password or login
							$("#login_username_error").css("display", "inline-block");
							$("#login_username_error").text("Wrong login or password");
							return;
						case 422:
							if (error.msg === "Name validation error") {
								$("#login_username_error").css("display", "inline-block");
								$("#login_username_error").text(
									"Name validation error. Only allowed A-Za-z0-9_",
								);
								return;
							} else {
								callPopup(`${error.msg}`, "alert_error");
								return;
							}
						case 504:
							callPopup(`${error.msg}`, "alert_error");
							return;
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				}
				console.log(error);
			});
	}

	$(".switch_log_reg").on("click", function () {
		switchLoginReg();
	});

	$(".logout").on("click", function () {
		callPopup("", "logout");
	});

	function switchLoginReg() {
		switch (switch_log_reg) {
			case "login":
				showRegForm();
				switch_log_reg = "reg";
				return;
			case "reg":
				showLoginForm();
				switch_log_reg = "login";
				return;
		}
	}

	function showLoginForm() {
		$("#reg_login_popup_shadow").css("display", "block");
		$("#registration_form").css("display", "none");
		$("#login_form").css("display", "block");
		$("#login_form").css("opacity", 0.0);
		$("#login_form").transition({
			opacity: 1.0,
			duration: 1000,
			easing: animation_rm_easing,
			complete: function () {},
		});
	}

	function showRegForm() {
		if (use_reg_recaptcha) {
			$(".google-captcha-terms").css("display", "block");
			const recaptcha_url = `https://www.google.com/recaptcha/api.js?render=6Lf4za4lAAAAAKntV6fQX7daXJeWspwIN_bOBmwW`;

			$("head").append(`<script src="${recaptcha_url}"></script>`);
		}
		$("#reg_login_popup_shadow").css("display", "block");
		$("#login_form").css("display", "none");
		$("#registration_form").css("display", "block");
		$("#registration_form").css("opacity", 0.0);
		$("#registration_form").transition({
			opacity: 1.0,
			duration: 1000,
			easing: animation_rm_easing,
			complete: function () {},
		});
	}

	$("#reg_login_cross").on("click", function () {
		$("#reg_login_popup_shadow").transition({
			opacity: 0.0,
			duration: animation_rm_duration,
			easing: animation_rm_easing,
			complete: function () {
				const script = document.querySelector(
					'script[src="https://www.google.com/recaptcha/api.js?render=6Lf4za4lAAAAAKntV6fQX7daXJeWspwIN_bOBmwW"]',
				);

				script?.remove();
				$("#reg_login_popup_shadow").css("display", "none");
			},
		});
	});

	//************************//
	//UPLOAD CHARACTERS ONLINE//
	$("#characloud_upload_character_button").on("click", function () {
		if (is_login) {
			$("#characloud_upload_character_file").trigger("click");
		} else {
			$("#characloud_profile_button").trigger("click");
		}
	});

	$("#characloud_upload_character_file").on("change", function (e) {
		// Load from file
		$("#rm_info_avatar").html("");
		var file = e.target.files[0];
		//console.log(1);
		if (!file) {
			return;
		}
		var ext = file.name.match(/\.(\w+)$/);
		if (!ext || (ext[1].toLowerCase() != "png" && ext[1].toLowerCase() != "webp")) {
			return;
		}
		//console.log(format);
		var formData = new FormData($("#form_characloud_upload_character").get(0));
		//let button_text = $('#characloud_upload_character_button').text();
		//let button_width = $('#characloud_upload_character_button').outerWidth();
		prepublishCard(formData);
	});

	$("#character_online_editor").on("click", function () {
		// Click from local library
		$("#chara_cloud").css("display", "block");
		$("#shell").css("display", "none");

		var formData = new FormData();
		formData.append("filename_local", Characters.id[Characters.selectedID].filename);

		showCharaCloud();
		prepublishCard(formData);
	});

	function prepublishCard(formData) {
		jQuery.ajax({
			type: "POST",
			url: "/api/characloud/characters/prepublish",
			data: formData,
			beforeSend: function () {
				//$('#characloud_upload_character_button').html('Uploading...');
				//$('#characloud_upload_character_button').css('width', button_width);
			},
			cache: false,
			timeout: 8 * 1000,
			contentType: false,
			processData: false,
			success: function (data) {
				charaCloud.cardeditor_image = data.image;
				showCharacterCard(data, "prepublish");
			},
			error: function (jqXHR, exception) {
				if (exception === "timeout") {
					callPopup("Timeout: Error uploading the character", "alert_error");
				} else {
					let error = handleError(jqXHR);
					callPopup(`${error.status} ${error.msg}`, "alert_error");
				}
			},
			complete: function (xhr, status) {
				//$('#characloud_upload_character_button').html(button_text);
			},
		});
	}

	$(".publish_button").on("click", function () {
		// Add card online
		if (login !== undefined) {
			charaCloud
				.publishCharacter("create_online")
				.then(function (data) {
					if (data.premod === true) {
						$(".character_published_popup_title").text(
							"Character added for moderation",
						);
					} else {
						$(".character_published_popup_title").text("Character Published");
					}

					$("#character_published_shadow").css("display", "flex");
					$("#character_published_shadow").css("opacity", 0.0);
					$("#character_published_popup_avatar").attr(
						"src",
						`./cardeditor/${charaCloud.cardeditor_image}`,
					);
					$("#character_published_shadow").transition({
						opacity: 1.0,
						duration: 600,
						easing: animation_rm_easing,
						complete: function () {},
					});

					if (charaCloud.cardeditor_id_local === -1) {
						$(".add_locally_button")
							.eq(0)
							.data("params", {
								type: "add_locally_with_publish",
								online_public_id: data.public_id,
							})
							.trigger("click");
					} else {
						$(".update_locally_button")
							.eq(0)
							.data("params", {
								type: "update_locally_with_publish",
								online_public_id: data.public_id,
							})
							.trigger("click");
					}
				})
				.catch(function (error) {
					console.log(error);
					switch (error.status) {
						case 504:
							callPopup(`${error.msg}`, "alert_error");
							return;
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				});
		}
	});

	$(".update_button").on("click", function () {
		// Update card online
		if (login !== undefined) {
			charaCloud
				.publishCharacter("edit_online")
				.then(function (data) {
					if (data.premod === true) {
						callPopup(`Character update added for moderation`, "alert");
					} else {
						callPopup(`Character updated`, "alert");
					}
					$(".update_locally_button")
						.eq(0)
						.data("params", {
							type: "update_locally_with_publish",
							online_public_id: data.public_id,
						})
						.trigger("click");
				})
				.catch(function (error) {
					console.log(error);
					switch (error.status) {
						default:
							callPopup(`${error.msg}`, "alert_error");
							return;
					}
				});
		}
	});

	$(".add_locally_button").on("click", function () {
		// Add new character from online editor to local storagev
		let type = "default";
		let online_public_id;
		let card_data = {};
		if ($(this).data("params") !== undefined) {
			type = $(this).data("params").type;
			online_public_id = vl($(this).data("params").online_public_id);

			charaCloud.cardeditor_data.public_id = online_public_id;
			charaCloud.cardeditor_data.public_id_short = online_public_id.substr(0, 6);
			charaCloud.cardeditor_data.user_name = login;
			charaCloud.cardeditor_data.user_name_view = login_view;
			charaCloud.cardeditor_data.online = true;
			charaCloud.cardeditor_data.add_date_local = Date.now();
			charaCloud.cardeditor_data.last_action_date = Date.now();
		}

		charaCloud
			.publishCharacter("add_locally")
			.then(async function (data) {
				if (type === "default") {
					callPopup(`Character added`, "alert");
				}

				var a = await Characters.loadAll();
				await characterAddedSign(data.file_name, "Character added");
				charaCloud.cardeditor_id_local = Characters.getIDbyFilename(
					`${data.file_name}.${characterFormat}`,
				);
				charaCloud.cardeditor_filename_local =
					Characters.id[charaCloud.cardeditor_id_local].filename;
				printCharacterPageLocalButtons();
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	});

	$(".update_locally_button").on("click", function () {
		// Update character from online editor to local storage
		let type = "default";
		let online_public_id;
		let card_data = {};
		if ($(this).data("params") !== undefined) {
			type = $(this).data("params").type;
			online_public_id = vl($(this).data("params").online_public_id);

			charaCloud.cardeditor_data.public_id = online_public_id;
			charaCloud.cardeditor_data.public_id_short = online_public_id.substr(0, 6);
			charaCloud.cardeditor_data.user_name = login;
			charaCloud.cardeditor_data.user_name_view = login_view;
			charaCloud.cardeditor_data.online = true;
			charaCloud.cardeditor_data.last_action_date = Date.now();
		}

		let char_id = Characters.getIDbyFilename(charaCloud.cardeditor_filename_local);

		charaCloud
			.publishCharacter("update_locally", Characters.id[char_id].filename)
			.then(async function (data) {
				if (type === "default") {
					callPopup(`Changes saved`, "alert");
				}
				await Characters.loadAll();
				char_id = Characters.getIDbyFilename(charaCloud.cardeditor_filename_local);
				Characters.onCharacterSelect({
					target: charaCloud.cardeditor_filename_local,
				});
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	});

	$("#character_published_popup_button").on("click", function () {
		$("#character_published_shadow").transition({
			opacity: 0.0,
			duration: 300,
			easing: animation_rm_easing,
			complete: function () {
				$("#character_published_shadow").css("display", "none");
			},
		});

		showUserProfile();
	});

	// Navigator
	function showMain() {
		hideAll();
		$("#characloud_bottom").css("display", "flex");
		$("#characloud_search_back_button").css("display", "none");
		$("#characloud_search_block").css("display", "none");
		$("#characloud_characters").css("display", "flex");
		$("#characloud_board").css("display", "block");
	}

	$(".characloud_user_profile_avatar_img").on("error", function () {
		// Set default avatar

		$(this).attr("src", "../img/default_avatar.png");
	});

	$(".characloud_user_profile_avatar").on("click", function () {
		if (charaCloud.user_profile_name === login) {
			$("#form_user_profile_avatar_file").trigger("click");
		}
	});

	$("#form_user_profile_avatar_file").on("change", function (e) {
		$("#rm_info_avatar").html("");
		var file = e.target.files[0];
		//console.log(1);
		if (!file) {
			return;
		}
		var ext = file.name.match(/\.(\w+)$/);
		if (
			!ext ||
			(ext[1].toLowerCase() != "png" &&
				ext[1].toLowerCase() != "webp" &&
				ext[1].toLowerCase() != "jpeg" &&
				ext[1].toLowerCase() != "jpg" &&
				ext[1].toLowerCase() != "gif")
		) {
			return;
		}
		//console.log(format);
		var formData = new FormData($("#form_user_profile_avatar").get(0));
		//let button_text = $('#characloud_upload_character_button').text();
		//let button_width = $('#characloud_upload_character_button').outerWidth();
		formData.append("user_name", login);
		jQuery.ajax({
			type: "POST",
			url: "/api/characloud/users/avatar",
			data: formData,
			beforeSend: function () {
				//$('#characloud_upload_character_button').html('Uploading...');
				//$('#characloud_upload_character_button').css('width', button_width);
			},
			cache: false,
			timeout: 8 * 1000,
			contentType: false,
			processData: false,
			success: function (data) {
				//charaCloud.cardeditor_image = data.image;

				$(".characloud_user_profile_avatar_img").attr(
					"src",
					`${charaCloudServer}/users/${login}/img/avatar.webp?v=${Date.now()}`,
				);
			},
			error: function (jqXHR, exception) {
				if (exception === "timeout") {
					callPopup("Timeout: Error uploading the character", "alert_error");
				} else {
					let error = handleError(jqXHR);
					callPopup(`${error.status} ${error.msg}`, "alert_error");
				}
			},
			complete: function (xhr, status) {
				//$('#characloud_upload_character_button').html(button_text);
			},
		});
	});

	$(".url-data").on("click", function () {
		window.open($(".url-data").attr("url"), "_blank");
	});

	$(".upload-avatar-button").on("click", function () {
		$(".characloud_user_profile_avatar").trigger("click");
	});

	$(".upload-character-button").on("click", function () {
		$("#characloud_upload_character_button").trigger("click");
	});

	function showUserProfile(user_name = undefined) {
		if (user_name === undefined) {
			user_name = login;
		}
		user_name = vl(user_name);
		charaCloud.user_profile_name = user_name;
		hideAll();
		$("#characloud_bottom").css("display", "flex");
		$("#characloud_header_navigator_p2").css("display", "inline-block");
		$("#characloud_header_navigator_c1").css("display", "inline-block");
		$(".characloud_content").css("display", "block");
		$("#characloud_user_profile_block").css("display", "block");

		$(".character-gallery-content").html("");
		$(".edit-mod-character-gallery-content").html("");
		$(".new-mod-character-gallery-content").html("");

		$(".characloud_user_profile_avatar_img").attr(
			"src",
			`${charaCloudServer}/users/${user_name.toLowerCase()}/img/avatar.webp`,
		);
		$(".url-data").css("display", "block");
		$(".url-data").text(`Profile: ${charaCloudServer}/${user_name.toLowerCase()}`);
		$(".url-data").attr("url", `${charaCloudServer}/${user_name.toLowerCase()}`);
		charaCloud
			.getUserCharacters(user_name.toLowerCase(), charaCloud.user_profile_page)
			.then(function (data) {
				data.name_view = vl(data.name_view);
				let user_count_pages = Math.ceil(
					data.charactersCount / charaCloud.max_user_page_characters_count,
				);
				if (user_count_pages === 0) {
					user_count_pages = 1;
				}
				$("#user_profile_page_pagination").text(
					`${charaCloud.user_profile_page}/${user_count_pages}`,
				);

				if (
					typeof login !== "undefined" &&
					user_name.toLowerCase() === login.toLowerCase()
				) {
					$("#user_profile_info_this_user").css("display", "inline-block");
					$(".characloud_user_profile_avatar").css("cursor", "pointer");
				} else {
					$(".profile-button").text("Characters: " + data.charactersCount);
					$("#user_profile_info_other_user").css("display", "inline-block");
					$(".characloud_user_profile_avatar").css("cursor", "auto");
				}
				if (data.status === 4) {
					$(".star-icon").css("display", "inline-block");
				} else {
					$(".star-icon").css("display", "none");
				}

				$("#characloud_header_navigator_p2").text(data.name_view);
				$("#user_profile_info")
					.children(".username")
					.children(".username_text")
					.text(data.name_view);
				$("#characloud_header_navigator_p2").text(data.name_view);
				if (data.characters[0] !== undefined) {
					if (data.characters[0].public_id !== null) {
						// Characters Gallery
						data.characters.forEach(function (item, i) {
							item.moderation = Boolean(item.moderation);
							item.user_name = user_name.toLowerCase();
							item.user_name_view = user_name;
							if (item.status === 4) {
								let $lastAppendedElement = $(".character-gallery-content")
									.append(charaCloud.getCharacterDivBlock(item, charaCloudServer))
									.last();
								//$('.character-gallery-content').append(`<div user_name="${data.name}" public_id_short="${item.public_id_short}" class="user_profile_character"><div class="user_profile_character_container"><img class="user_profile_character_img" src="${charaCloudServer}/${data.name}/${item.public_id_short}.webp"><img class="user_profile_character_delete" src="./img/cross.png"></div></div>`);

								if (login === user_name.toLowerCase()) {
									$(
										".character-gallery-content .characloud_character_block  .characloud_character_block_card",
									)
										.last()
										.append(
											'<img class="user_profile_character_delete" src="./img/cross.png">',
										);
								}
							}
						});
						// Character on moderation
						let is_show_new_moderation_gallery = false; //new-moderation-gallery
						let is_show_edit_moderation_gallery = false; //new-moderation-gallery

						if (login === user_name.toLowerCase()) {
							// New characters
							data.characters.forEach(function (item, i) {
								item.moderation = Boolean(item.moderation);
								item.user_name = user_name.toLowerCase();
								item.user_name_view = user_name;
								if (item.moderation === true && item.status === 2) {
									is_show_new_moderation_gallery = true;
									let $lastAppendedElement = $(
										".new-mod-character-gallery-content",
									)
										.append(
											charaCloud.getCharacterDivBlock(
												item,
												charaCloudServer,
												"moderation",
											),
										)
										.last();
									//$('.character-gallery-content').append(`<div user_name="${data.name}" public_id_short="${item.public_id_short}" class="user_profile_character"><div class="user_profile_character_container"><img class="user_profile_character_img" src="${charaCloudServer}/${data.name}/${item.public_id_short}.webp"><img class="user_profile_character_delete" src="./img/cross.png"></div></div>`);
									$(
										".new-mod-character-gallery-content .characloud_character_block  .characloud_character_block_card",
									)
										.last()
										.append(
											'<img class="user_profile_character_delete" src="./img/cross.png">',
										);
								}
							});
							if (is_show_new_moderation_gallery) {
								$(".new-mod-character-gallery").css("display", "block");
							}

							// Edited characters
							data.characters.forEach(function (item, i) {
								item.moderation = Boolean(item.moderation);
								item.user_name = user_name.toLowerCase();
								item.user_name_view = user_name;
								if (item.moderation === true && item.status === 4) {
									is_show_edit_moderation_gallery = true;
									let $lastAppendedElement = $(
										".edit-mod-character-gallery-content",
									)
										.append(
											charaCloud.getCharacterDivBlock(
												item,
												charaCloudServer,
												"moderation",
											),
										)
										.last();
									//$('.character-gallery-content').append(`<div user_name="${data.name}" public_id_short="${item.public_id_short}" class="user_profile_character"><div class="user_profile_character_container"><img class="user_profile_character_img" src="${charaCloudServer}/${data.name}/${item.public_id_short}.webp"><img class="user_profile_character_delete" src="./img/cross.png"></div></div>`);
									$(
										".edit-mod-character-gallery-content .characloud_character_block  .characloud_character_block_card",
									)
										.last()
										.append(
											'<img class="user_profile_character_delete" type="edit_moderation" src="./img/cross.png">',
										);
								}
							});
							if (is_show_edit_moderation_gallery) {
								$(".edit-mod-character-gallery").css("display", "block");
							}
						}
						$(".lazy").lazyLoadXT({ edgeX: 500, edgeY: 500 });
					}
				}
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	}

	function showCharacterCardBlock() {
		hideAll();
		$(".url-data").css("display", "none");
		$("#characloud_header_navigator_p2").css("display", "inline-block");
		$("#characloud_header_navigator_c1").css("display", "inline-block");

		$("#characloud_header_navigator_p3").css("display", "inline-block");

		$("#characloud_header_navigator_c2").css("display", "inline-block");

		$(".characloud_content").css("display", "block");
		$("#characloud_bottom").css("display", "flex");
		$("#characloud_character_page").css("display", "grid");
	}

	async function showCharacterCard(data, type = "prepublish") {
		// actions with card: prepublish, select_online

		$(".publish_button").css("display", "none");
		$(".update_button").css("display", "none");
		$(".to_chat_button").css("display", "none");
		$(".update_locally_button").css("display", "none");
		$(".add_locally_button").css("display", "none");
		$(".load_update_button").css("display", "none");
		let character_data;
		let online_data;
		let image_size = data.image_size;

		showCharacterCardBlock();
		if (type === "prepublish") {
			character_data = JSON.parse(data.character);
			if (character_data.user_name_view === undefined) {
				if (login_view !== undefined) {
					$("#characloud_header_navigator_p2").text(login_view);
				} else {
					$("#characloud_header_navigator_p2").text("User");
				}
				$("#characloud_header_navigator_p3").text("Publishing Character");
			} else {
				$("#characloud_header_navigator_p3").text(character_data.name);
				$("#characloud_header_navigator_p2").text(character_data.user_name_view);
			}
		} else if (type === "select_online") {
			character_data = data.character_data;
			$("#characloud_header_navigator_p3").text(character_data.name);
			$("#characloud_header_navigator_p2").text(character_data.user_name_view);
		}

		if (character_data.nsfw === undefined) {
			character_data.nsfw = false;
		}
		$("#editor_nsfw").prop("checked", character_data.nsfw);

		// Character edit Categories
		if (character_data.categories !== undefined) {
			let categories = character_data.categories;
			categories.forEach(function (item, i) {
				addCategory(item);
			});
		}
		charaCloud
			.getCategories() // autocomplete
			.then(function (data) {
				$(".popular-categories-list").html("");
				$(".popular-categories-title").text("Popular categories");
				const top_categories = data.sort((a, b) => b.count - a.count).slice(0, 10);
				top_categories.forEach(function (item, i) {
					$(".popular-categories-list").append(
						`<div class="category popular-category">+ ${item.name} (${item.count})</div>`,
					);
				});
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});

		// Online checking
		let character_data_online;
		let online_type_action = "publish";
		if (character_data.online == true) {
			character_data_online = await charaCloud
				.getCharacter(character_data.user_name, character_data.public_id_short)
				.then(function (ch_data_online) {
					return ch_data_online;
				})
				.catch(function (error) {
					console.log(error);
					return false;
				});
			if (character_data_online === false) {
				online_type_action = "publish";
			} else {
				online_type_action = "update";
			}
		} else {
			online_type_action = "publish";
		}

		// Print online buttons
		if (login !== undefined) {
			if (login === character_data.user_name || character_data.user_name === undefined) {
				if (online_type_action === "publish") {
					$(".publish_button").css("display", "inline-block");
				}
				if (online_type_action === "update") {
					$(".update_button").css("display", "inline-block");
				}
			} else {
				$(".url-data").css("display", "inline-block");
				character_data.user_name = vl(character_data.user_name);
				character_data.public_id_short = vl(character_data.public_id_short);
				$(".url-data").text(
					`${charaCloudServer}/${character_data.user_name.toLowerCase()}/${
						character_data.public_id_short
					}`,
				);
				$(".url-data").attr(
					"url",
					`${charaCloudServer}/${character_data.user_name.toLowerCase()}/${
						character_data.public_id_short
					}`,
				);
			}
		} else {
		}
		// Local checking
		charaCloud.cardeditor_id_local = -1;
		charaCloud.cardeditor_filename_local = undefined;
		if (character_data.public_id !== undefined) {
			if (character_data.public_id != "undefined" && character_data.public_id.length > 0) {
				charaCloud.cardeditor_id_local = Characters.getIDbyPublicID(
					character_data.public_id,
				);
				if (charaCloud.cardeditor_id_local !== -1) {
					charaCloud.cardeditor_filename_local =
						Characters.id[charaCloud.cardeditor_id_local].filename;
				}
			}
		}

		printCharacterPageLocalButtons();
		// Next
		$(".characloud_character_page_avatar")
			.children("img")
			.attr("src", `cardeditor/${data.image}`);
		charaCloud.cardeditor_data = character_data;

		$("#name-input").val(character_data.name);
		$("#short-description-input").val(character_data.short_description);
		$("#personality-summary-input").val(character_data.personality);
		$("#scenario-textarea").val(character_data.scenario);
		textareaAutosize($("#scenario-textarea"));
		$("#description-textarea").val(character_data.description);
		textareaAutosize($("#description-textarea"));
		$("#dialogues-example-textarea").val(character_data.mes_example);
		textareaAutosize($("#dialogues-example-textarea"));
		$("#first-message-textarea").val(character_data.first_mes);
		textareaAutosize($("#first-message-textarea"));

		$("#avatar-info-name").text(character_data.name);
		let author;
		if (character_data.user_name_view !== undefined) {
			author = character_data.user_name_view;
		} else {
			author = login_view;
		}
		$("#avatar-info-author").text(`Author: ${author}`);
		$("#avatar-info-filesize").text(`File Size: ${parseFloat(image_size).toFixed(1)}kb`);

		let this_date = Number(character_data.create_date_online);
		if (character_data.create_date_online === undefined) {
			this_date = Number(Date.now());
		}

		//console.log(`${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`);
		$("#avatar-info-creation-date").text(`Creation Date: ${TavernDate(this_date)}`);
	}

	function printCharacterPageLocalButtons() {
		$(".characloud_character_page_top_info").text("");
		$(".add_locally_button").css("display", "none");
		$(".update_locally_button").css("display", "none");
		// Print local buttons
		if (charaCloud.cardeditor_id_local !== -1) {
			$(".update_locally_button").css("display", "inline-block");
			$(".characloud_character_page_top_info").text(
				Characters.id[charaCloud.cardeditor_id_local].filename,
			);
		} else {
			$(".add_locally_button").css("display", "inline-block");
		}
	}

	function hideAll() {
		$("#characloud_bottom").css("display", "none");
		$("#user_profile_info_this_user").css("display", "none");
		$("#user_profile_info_other_user").css("display", "none");
		$("#characloud_category").css("display", "none");
		$("#characloud_categories").css("display", "none");
		$("#characloud_search_back_button").css("display", "none");
		$("#characloud_search_block").css("display", "none");
		$(".characloud_content").css("display", "none");
		$("#characloud_character_page").css("display", "none");
		$("#reg_login_popup_shadow").css("display", "none");
		$("#characloud_user_profile_block").css("display", "none");
		$("#characloud_characters").css("display", "none");
		$("#characloud_board").css("display", "none");
		$("#characloud_search_back_button").css("display", "none");
		$("#characloud_search_block").css("display", "none");

		$("#characloud_header_navigator_p2").css("display", "none");
		$("#characloud_header_navigator_p3").css("display", "none");
		$("#characloud_header_navigator_c1").css("display", "none");
		$("#characloud_header_navigator_c2").css("display", "none");

		$(".new-moderation-gallery").css("display", "none");
		$(".edit-moderation-gallery").css("display", "none");

		$(".category-list").html("");
	}

	$("#characloud_close_button").on("click", function () {
		hideCharaCloud();
	});

	$("#characloud_header_navigator_p1").on("click", function () {
		showMain();
	});

	$("#characloud_header_navigator_p2").on("click", function () {
		if ($("#characloud_header_navigator_p2").text() === "Category") {
			showCategories();
		} else {
			showUserProfile($("#characloud_header_navigator_p2").text());
		}
	});

	$("#user_profile_prev_button").on("click", function () {
		if (charaCloud.user_profile_page > 1) {
			charaCloud.user_profile_page--;
			showUserProfile(charaCloud.user_profile_name);
		}
	});

	$("#user_profile_next_button").on("click", function () {
		if (
			charaCloud.user_profile_page <
			Math.ceil(
				charaCloud.user_page_characters_count / charaCloud.max_user_page_characters_count,
			)
		) {
			charaCloud.user_profile_page++;
			showUserProfile(charaCloud.user_profile_name);
		}
	});

	$(".character-gallery-content").on("click", ".user_profile_character", function () {
		const publicIdShort = $(this).attr("public_id_short");
		const userName = $(this).attr("user_name");
		const mode = $(this).attr("mode");
		selectCharacterCardOnline(userName, publicIdShort, mode);

		// Rest of your code to handle the click event goes here
	});

	$("#characloud_user_profile_block").on(
		"click",
		".user_profile_character_delete",
		function (event) {
			event.stopPropagation();
			const type = $(this).attr("type");
			const publicIdShort = $(this).parent().parent().attr("public_id_short");
			const userName = $(this).parent().parent().attr("user_name");
			if (type === "edit_moderation") {
				charaCloud.delete_character_user_name = userName;
				charaCloud.delete_character_public_id_short = publicIdShort;
				callPopup("<h3>Cancel editing?</h3>", "del_ch_characloud_from_edit_moderation");
			} else {
				charaCloud.delete_character_user_name = userName;
				charaCloud.delete_character_public_id_short = publicIdShort;
				callPopup("<h3>Delete the character?</h3>", "del_ch_characloud");
			}
		},
	);

	function selectCharacterCardOnline(userName, publicIdShort, mode = "default") {
		charaCloud
			.getCharacter(userName, publicIdShort, mode)
			.then(function (data) {
				$("#chara_cloud").scrollTop(0);
				showCharacterCard(data, "select_online");
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	}

	$("#characloud_upload_character_page_avatar").on("change", function (e) {
		charaCloud
			.changeCharacterAvatar(e)
			.then(function (data) {
				//
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	});

	///////////////////////////
	//********* Categories ********//
	$("#header_categories").on("click", ".header-category", function () {
		let this_category = $(this).data("category");
		if (this_category === "$categories") {
			showCategories();
			return;
		} else {
			showCategory($(this).data("category"));
		}
	});

	var is_character_page_categories_show = false;
	$("#category-input-field").on("focus", function () {
		if (!is_character_page_categories_show) {
			$(".popular-categories").slideDown(200, function () {
				is_character_page_categories_show = true;
				//$(this).transit({ y: '3px' }, 50)
				//     .transit({ y: '-3px' }, 50)
				//   .transit({ y: '0px' }, 50);
			});
		}
	});

	$(document).on("click", function (e) {
		if (
			!$(".category-form").is(e.target) &&
			$(".category-form").has(e.target).length === 0 &&
			is_character_page_categories_show
		) {
			is_character_page_categories_show = false;
			$(".popular-categories").slideUp(200);
		}
	});

	$("#category-input-field").on("keypress", function (e) {
		if (e.which == 13) {
			// 13 is the code for the Enter key
			let category = $(this).val().trim();
			addCategory(vl(category));
		}
	});

	function addCategory(category) {
		category = window.DOMPurify.sanitize(category);
		let categoryRegex = /^[A-Za-z0-9_\- ]{1,32}$/;
		let existingCategories = $(".character-category")
			.map(function () {
				return $(this).text().replace("x", "").trim().toLowerCase();
			})
			.get();
		if (existingCategories.includes(category.toLowerCase())) {
			//alert('This category has already been added.');
			$("#category-input-field").val("");
		} else if ($(".character-category").length < 12) {
			if (categoryRegex.test(category)) {
				$("#category-input-field").val("");
				$(".category-list").append(
					'<div class="category character-category">' +
						category +
						'<span class="category-remove">x</span></div>',
				);
				$(this).val("");
			} else {
				callPopup(
					"Invalid category format. Categories can only contain letters, numbers, spaces, underscores, hyphens, and must be between 1 and 32 characters long.",
					"alert_error",
				);
			}
		} else {
			callPopup(
				"You have reached the maximum number of categories allowed (12).",
				"alert_error",
			);
		}
	}

	$(document).on("click", ".character-category", function (e) {
		$(this).remove();
	});

	$(".category-form").on("click", ".popular-category", function (e) {
		let category = $.trim(
			$(this)
				.text()
				.substring(2)
				.replace(/ *\([^)]*\) */g, ""),
		);
		addCategory(category);
	});

	$("#chara_cloud").on("click", ".characloud_characters_category_title", function () {
		let category = $(this).attr("category");
		showCategory(category);
	});

	function showCategory(category) {
		charaCloud
			.getCharactersByCategory(category)
			.then(function (data) {
				let count_char_in_row = 10;
				let characters_board = [];
				if (category === "$random" || category === "$recent") {
					category = category.substring(0, 2).toUpperCase() + category.substring(2);
				}
				let category_show = category.replace("$", "");

				let end = 0;
				if (false) {
					for (let i = 0; end < data.length; i++) {
						const start = i * count_char_in_row;
						end = start + count_char_in_row;
						const anime_characters = data.slice(start, end);
						characters_board.push({
							title: category_show,
							characters: data.slice(start, end),
						});
					}
				}
				hideAll();
				$("#characloud_header_navigator_p2").css("display", "inline-block");
				$("#characloud_header_navigator_c1").css("display", "inline-block");
				$("#characloud_header_navigator_c2").css("display", "inline-block");
				$("#characloud_header_navigator_p3").css("display", "inline-block");

				$("#characloud_header_navigator_p2").text("Category");
				$("#characloud_header_navigator_p3").text(category_show);

				$("#characloud_category").html("");
				$("#characloud_category").css("display", "block");
				$(".characloud_content").css("display", "block");
				data.forEach(function (item, i) {
					$("#characloud_category").append(
						charaCloud.getCharacterDivBlock(item, charaCloudServer),
					);
				});
				$(".lazy").lazyLoadXT({ edgeX: 500, edgeY: 500 });

				//$('#characloud_characters').html('');
				//printCharactersBoard(characters_board);
				//$('#chara_cloud').scrollTop(0);
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	}
	function showCategories() {
		charaCloud
			.getCategories()
			.then(function (data) {
				hideAll();
				$("#characloud_bottom").css("display", "flex");
				$("#characloud_header_navigator_p2").css("display", "inline-block");
				$("#characloud_header_navigator_c1").css("display", "inline-block");
				$("#characloud_header_navigator_p2").text("Category");
				$("#characloud_categories").css("display", "block");
				$(".characloud_content").css("display", "block");

				const $categoriesList = $(".categories-list");
				$categoriesList.html("");
				//$categoriesList.html('');
				let categories = [
					{ name: "$recent", name_view: "$Recent" },
					{ name: "$random", name_view: "$Random" },
				];

				categories = categories.concat(data);
				let categories_sort = categories;
				categories = categories_sort.sort((a, b) => b.count - a.count);
				// loop through the categories array and create a category element for each one
				for (let i = 0; i < categories.length; i++) {
					let name_view = categories[i].name_view;
					if (categories[i].name !== "$recent" && categories[i].name !== "$random") {
						name_view = `${name_view} (${categories[i].count})`;
					}
					const $category = $("<div>", {
						class: "category show-category",
						text: name_view,
						"data-category": categories[i].name,
					});
					$categoriesList.append($category);
				}
			})
			.catch(function (error) {
				console.log(error);
				switch (error.status) {
					default:
						callPopup(`${error.msg}`, "alert_error");
						return;
				}
			});
	}

	$("#characloud_categories").on("click", ".show-category", function (e) {
		let category = $(this).attr("data-category");
		showCategory(category);
	});

	// Hide button
	$(".toggle_openai_key").on("click", function () {
		const input_el = $(this).parent().children().first();
		const isHidden = input_el.prop("type") === "password";

		if (isHidden) {
			input_el.prop("type", "text");
			$(this).children().first().addClass("fa-eye-slash").removeClass("fa-eye");
		} else {
			input_el.prop("type", "password");
			$(this).children().first().addClass("fa-eye").removeClass("fa-eye-slash");
		}
	});
});

function handleError(jqXHR) {
	// Need to make one handleError and in script.js and in charaCloud.js
	let msg;
	let status;
	try {
		let msg_json = JSON.parse(jqXHR.responseText);
		msg = msg_json.error;
	} catch {
		msg = "Unique error";
	}
	if (jqXHR.status !== undefined) {
		status = jqXHR.status;
	} else {
		status = 400;
	}
	if (status === 504) {
		msg = "Server is not responding";
	}
	if (status === 429) {
		msg = "Too many requests";
	}
	console.log(`Status: ${status}`);
	console.log(msg);
	return { status: status, msg: msg };
}
