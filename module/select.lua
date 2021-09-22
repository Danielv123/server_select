local clusterio_api = require("modules/clusterio/api")
local mod_gui = require("mod-gui")


local function on_server_startup()
    if not global.server_select then
        global.server_select = {}
    end
    if not global.server_select.instances then
        global.server_select.instances = {}
    end
    if not global.server_select.guis then
        global.server_select.guis = {}
    end
end

local function get_this_instance()
    local instance_id = clusterio_api.get_instance_id()
    return instance_id and global.server_select.instances[instance_id]
end

local function server_select_gui(player)
    local this_instance = get_this_instance()
    if not this_instance then
        this_instance = {
            id = clusterio_api.get_instance_id(),
            name = clusterio_api.get_instance_name(),
            status = "running",
            game_version = game.active_mods.base,
        }
        global.server_select.instances[this_instance.id] = this_instance
    end

    local frame_flow = mod_gui.get_frame_flow(player)
    local gui = frame_flow.add {
        type = "frame",
        name = "server_select-frame",
        direction = "horizontal",
        caption = 'Server Select',
        style = mod_gui.frame_style,
    }
    global.server_select.guis[player.index] = gui
    player.opened = gui

    local instances = {}
    for id, instance in pairs(global.server_select.instances) do
        table.insert(instances, instance)
    end

    local column_count = math.ceil(#instances / 10)
    local columns = {}
    for index, instance in ipairs(instances) do
        local column_index = 1 + ((index-1) % column_count)
        if not columns[column_index] then
            columns[column_index] = {}
        end
        table.insert(columns[column_index], instance)
    end

    if #columns == 0 then
        gui.add {
            type = "label",
            name = "server_select-no_instances",
            caption = "No other instances online",
        }
    end

    for index, column in ipairs(columns) do
        local flow = gui.add {
            type = "flow",
            name = "server_select-column-" .. index,
            direction = "vertical",
        }
        flow.style.vertical_spacing = 0
        for _, instance in ipairs(column) do
            local button = flow.add {
                type = "button",
                name = "server_select-instance-" .. instance.id,
                caption = instance.name,
            }

            if instance.id == this_instance.id then
                button.enabled = false
                button.style = "green_button"
                button.tooltip = "You are here"

            elseif instance.status == "unknown" then
                button.enabled = instance.game_port ~= nil
                button.style.font_color = { r = 0.65 }
                button.style.hovered_font_color = { r = 0.65 }
                button.style.clicked_font_color = { r = 0.65 }
                button.style.disabled_font_color = { r = 0.75, g = 0.1, b = 0.1 }
                button.tooltip = "Unknown status for this server"

            elseif instance.status ~= "running" then
                button.enabled = false
                button.tooltip = "This server is offline"

            elseif instance.game_version ~= this_instance.game_version then
                button.enabled = false
                button.style = "red_button"
                button.tooltip = "On Factorio version " .. instance.game_version
            end

            button.style.minimal_width = 72
            button.style.horizontal_align = "left"
            button.style.horizontally_stretchable = true

        end
    end
end

local function toggle_server_select_gui(player_index)
    local player = game.get_player(player_index)

    if global.server_select.guis[player_index] then
        global.server_select.guis[player_index].destroy()
        global.server_select.guis[player_index] = nil
        player.opened = nil

    else
        server_select_gui(player)
    end
end

local function checkbutton(e)
    local player = game.get_player(e.player_index)
    local anchorpoint = mod_gui.get_button_flow(player)

    local button = anchorpoint["server_select-button"]
    if button then
        button.destroy()
        button = nil
    end

    if not button then
        button = anchorpoint.add {
            type = "sprite-button",
            name = "server_select-button",
            sprite = "utility/surface_editor_icon",
            style = mod_gui.button_style,
            tooltip = ""
        }
    end
end

local function on_gui_click(event)
    if not (event.element and event.element.valid) then return end
    local element_name = event.element.name

    if element_name == "server_select-button" then
        toggle_server_select_gui(event.player_index)
        return
    end

    local match = element_name:match("^server_select%-instance%-(%d+)$")
    if match then
        local instance_id = tonumber(match)
        local instance = global.server_select.instances[instance_id]

        if instance and instance.game_port and instance.public_address then
            game.get_player(event.player_index).connect_to_server {
                address = instance.public_address .. ":" .. instance.game_port,
                name = instance.name
            }
            toggle_server_select_gui(event.player_index)
        end

        return
    end
end


local select = {}

select.events = {
    [clusterio_api.events.on_server_startup] = on_server_startup,
    [defines.events.on_player_joined_game] = checkbutton,
    [defines.events.on_gui_click] = on_gui_click,
}

server_select = {}
function server_select.update_instances(data, full)
    if full then
        global.server_select.instances = {}
    end
    local instances = game.json_to_table(data)
    for _, instance in ipairs(instances) do
        if instance.removed then
            global.server_select.instances[instance.id] = nil
        else
            global.server_select.instances[instance.id] = instance
        end
    end

    -- Update open server lists
    for player_index, gui in pairs(global.server_select.guis) do
        gui.destroy()
        global.server_select.guis[player_index] = nil
        server_select_gui(game.get_player(player_index))
    end
end

return select
