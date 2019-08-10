local ceil = math.ceil
local insert = table.insert

local function initialize()
    global.serverselect = global.serverselect or {}
    global.lastSecondTicks = global.lastSecondTicks or {}
    global.servers = global.servers or {}
end

script.on_init(function()
    initialize()
end)

local function gui_serverselect(player_index)
    if table_size(global.servers) == 0 then
        return
    end

    if global.serverselect == nil then
        global.serverselect = {}
    end

    local player = game.players[player_index]

    if global.serverselect[player_index] then
        global.serverselect[player_index].gui.destroy()
        global.serverselect[player_index] = nil
        player.opened = nil
        return
    end

    if not (global.worldID and global.servers[tostring(global.worldID)] and global.servers[tostring(global.worldID)].instanceName) then
        return
    end

    global.serverselect[player_index] = {}
    global.serverselect[player_index].gui = player.gui.top.add{type = 'frame', name = 'clusterio-serverselect-frame', direction = 'vertical', caption = 'You are on "' .. (global.servers and global.servers[tostring(global.worldID)] and global.servers[tostring(global.worldID)].instanceName) .. '". Where to go now?'}
    local gui = global.serverselect[player_index].gui
    player.opened = gui

    global.serverselect[player_index].servermap = {}
    local servercolumcount = math.ceil(table_size(global.servers) / 10)

    local columnServers = {}
    local serverIndex = 1
    for _, server in pairs(global.servers) do
        if tostring(_) == tostring(global.worldID) then
        else
            local column = 1 + ((serverIndex-1) % servercolumcount)
            local row = ceil(serverIndex / servercolumcount)

            if not global.serverselect[player_index].servermap[column] then
                global.serverselect[player_index].servermap[column] = {}
            end
            if not columnServers[column] then
                columnServers[column] = {}
            end

            global.serverselect[player_index].servermap[column][row] = server
            columnServers[column][row] = {"", server.instanceName}
            serverIndex = serverIndex + 1
        end
    end

    local table = gui.add{type="table", column_count=servercolumcount}
    for i=1, servercolumcount, 1 do
        table.add{type="list-box", name="clusterio-servers-" .. i, items=columnServers[i]};
    end
end

local function checkbutton(e)
    local player = game.players[e.player_index]
    local anchorpoint = mod_gui.get_button_flow(player)

    local button = anchorpoint["clusterio-serverselect-button"]
    if button then
        button.destroy()
        button = nil
    end

    if not button then
        button = anchorpoint.add{
            type = "sprite-button",
            name = "clusterio-serverselect-button",
            sprite = "utility/surface_editor_icon",
            style = mod_gui.button_style,
            tooltip = ""
        }
    end
end

local function averageOfDifference( t )
    local count, sum, lastValue = 0,0,0

    for k,v in pairs(t) do
        if type(v) == 'number' then
            if lastValue > 0 then
                count = count + 1
                sum = sum + (v - lastValue)
            end
            lastValue = v
        end
    end

    if count == 0 then
        return 0
    end

    return math.floor((sum/count) + 0.5)
end
local function updateServerUPS(ups)
    local instanceName = (global.servers and global.servers[tostring(global.worldID)] and global.servers[tostring(global.worldID)].instanceName)
    if not instanceName then
        return
    end

    for _, player in pairs(game.connected_players ) do
        local anchorpoint = mod_gui.get_button_flow(player)
        local button = anchorpoint["clusterio-serverselect-button"]

        if button then
            button.tooltip = 'You are on "' .. instanceName .. '" - Server-UPS: ' .. ups
        end
    end
end

script.on_event(defines.events.on_player_joined_game, checkbutton)
script.on_event(defines.events.on_gui_click, function (event)
    if not (event.element and event.element.valid) then return end
    local element_name = event.element.name

    if element_name == "clusterio-serverselect-button" then
        gui_serverselect(event.player_index)
        return
    end

    if string.find(element_name, 'clusterio-server-',1,true) then
        element_name = string.gsub(element_name, '^clusterio%-server%-', "")
        local server = global.servers[element_name]

        if server then
            game.players[event.player_index].connect_to_server({address = server.publicIP .. ":" .. server.serverPort, name = server.instanceName})
            gui_serverselect(event.player_index)
        end

        return
    end
end)

script.on_event(defines.events.on_gui_selection_state_changed, function(event)
    if not (event.element and event.element.valid) then return end

    local player_index = event.player_index
    local element = event.element
    local element_name = element.name

    if string.find(element_name, 'clusterio-servers-',1,true) then
        local selected_index = element.selected_index

        local column = string.gsub(element_name, '^clusterio%-servers%-', "")

        local server = global.serverselect[player_index]
                    and global.serverselect[player_index].servermap
                    and global.serverselect[player_index].servermap[tonumber(column)]
                    and global.serverselect[player_index].servermap[tonumber(column)][selected_index]

        if server then
            game.players[player_index].connect_to_server({address = server.publicIP .. ":" .. server.serverPort, name = server.instanceName})
        end

        gui_serverselect(player_index)
        return
    end
end)


remote.remove_interface("serverSelect");
remote.add_interface("serverSelect", {
    setWorldId = function(newid)
        global.worldID = newid
    end,
    reportPassedSecond = function()
        insert(global.lastSecondTicks, game.tick)
        if #global.lastSecondTicks > 5 then
            table.remove(global.lastSecondTicks, 1)
        end

        if #global.lastSecondTicks > 1 then
            updateServerUPS(averageOfDifference(global.lastSecondTicks))
        end
    end,
    json = function(jsonString)
        local data = game.json_to_table(jsonString)
        if data.event == "instances" then
            global.servers = data.data
        end

        rcon.print(1)
    end
})
