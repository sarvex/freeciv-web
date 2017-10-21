/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

var OVERVIEW_TILE_SIZE = 1;
var overviewTimerId = -1;
var min_overview_width = 200;
var max_overview_width = 300;
var max_overview_height = 300;

var OVERVIEW_REFRESH = 6000;

var palette = [];
var palette_color_offset = 0;
var palette_terrain_offset = 0;

var overview_active = false;

var COLOR_OVERVIEW_UNKNOWN = 0; /* Black */
var COLOR_OVERVIEW_MY_CITY = 1; /* white */
var COLOR_OVERVIEW_ALLIED_CITY = 2;
var COLOR_OVERVIEW_ENEMY_CITY = 3; /* cyan */
var COLOR_OVERVIEW_MY_UNIT = 4; /* yellow */
var COLOR_OVERVIEW_ALLIED_UNIT = 5;
var COLOR_OVERVIEW_ENEMY_UNIT = 6; /* red */
var COLOR_OVERVIEW_VIEWRECT = 7; /* white */

var overview_hash = -1;


/****************************************************************************
  Initilaize the overview map.
****************************************************************************/
function init_overview()
{
  while (min_overview_width > OVERVIEW_TILE_SIZE * map['xsize']) {
    OVERVIEW_TILE_SIZE++;
  }

  overview_active = true;

  $("#game_overview_panel").attr("title", "World map");
  $("#game_overview_panel").dialog({
			bgiframe: true,
			modal: false,
			resizable: false,
			closeOnEscape: false,
			dialogClass: 'overview_dialog no-close',
			autoResize:true,
			width: "auto",
			close: function(event, ui) { overview_active = false;}
		}).dialogExtend({
                  "minimizable" : true,
                  "closable" : false,
                  "icons" : {
                    "minimize" : "ui-icon-circle-minus",
                    "restore" : "ui-icon-bullet"
                  }});

  $("#game_overview_panel").parent().css("overflow", "hidden");

  palette = generate_palette();

  redraw_overview();

  var new_width = OVERVIEW_TILE_SIZE * map['xsize'];
  if (new_width > max_overview_width) new_width = max_overview_width;
  var new_height = OVERVIEW_TILE_SIZE * map['ysize'];
  if (new_height > max_overview_height) new_height = max_overview_height;
  $('#overview_map').width(new_width);
  $('#overview_map').height(new_height);
  $(".overview_dialog").position({my: 'left bottom', at: 'left bottom', of: window, within: $("#game_page")});

  $('#overview_map').on('dragstart', function(event) { event.preventDefault(); });
}

/****************************************************************************
  Redraw the overview map.
****************************************************************************/
function redraw_overview()
{
  if (mapview_slide['active'] || C_S_RUNNING > client_state()
      || map['xsize'] == null || map['ysize'] == null
      || $("#overview_map").length == 0) return;

  var hash = generate_overview_hash(map['xsize'], map['ysize'])

  if (hash != overview_hash) {
    bmp_lib.render('overview_map',
                    generate_overview_grid(map['xsize'], map['ysize']),
                    palette);
    overview_hash = hash;
  }

}


/****************************************************************************
  Creates a grid representing the image for the overview map.
****************************************************************************/
function generate_overview_grid(cols, rows) {
  // Loop variables
  var row, col;

  // The grid of points that make up the image.
  var grid = Array(rows*OVERVIEW_TILE_SIZE);
  for (row = 0; row < rows * OVERVIEW_TILE_SIZE; row++) {
    grid[row] = Array(cols * OVERVIEW_TILE_SIZE);
  }

  for (var x = 0; x < rows ; x++) {
    for (var y = 0; y < cols; y++) {
      var ocolor = overview_tile_color(y, x);
      render_multipixel(grid, x, y, ocolor);
    }
  }

  render_viewrect(grid);

  return grid;
}

/****************************************************************************
  Creates a hash of the current overview map.
****************************************************************************/
function generate_overview_hash(cols, rows) {

  var hash = 0;
  var row, col;

  for (var x = 0; x < rows ; x++) {
    for (var y = 0; y < cols; y++) {
      hash += overview_tile_color(y, x);
    }
  }

  if (renderer == RENDERER_2DCANVAS) {
    var r = base_canvas_to_map_pos(0, 0);
    if (r != null) {
      hash += r['map_x'];
      hash += r['map_y'];
    }
  } else {
    var ptile = webgl_canvas_pos_to_tile($(window).width() / 6, $(window).height() / 6);
    if (ptile != null) {
      hash += ptile['x'];
      hash += ptile['y'];
    }
  }
  return hash;
}

/****************************************************************************
  ...
****************************************************************************/
function render_viewrect(grid)
{
  var r;

  if (C_S_RUNNING != client_state() && C_S_OVER != client_state()) return;

  if (renderer == RENDERER_2DCANVAS && mapview['gui_x0'] != 0 && mapview['gui_y0'] != 0) {

    var r = base_canvas_to_map_pos(0, 0);
    var s = base_canvas_to_map_pos(mapview['width'], 0);
    var t = base_canvas_to_map_pos(0, mapview['height']);
    var u = base_canvas_to_map_pos(mapview['width'], mapview['height']);

    drawLine(grid, r['map_y'], r['map_x'], s['map_y'], s['map_x']);
    drawLine(grid, s['map_y'], s['map_x'], u['map_y'], u['map_x']);
    drawLine(grid, t['map_y'], t['map_x'], u['map_y'], u['map_x']);
    drawLine(grid, r['map_y'], r['map_x'], t['map_y'], t['map_x']);

  } else {
    var ptile1 = webgl_canvas_pos_to_tile($(window).width() / 6, $(window).height() / 6);
    var ptile2 = webgl_canvas_pos_to_tile($(window).width() - $(window).width() / 6, $(window).height() / 6);
    var ptile3 = webgl_canvas_pos_to_tile($(window).width() / 6, $(window).height() - height_offset);
    var ptile4 = webgl_canvas_pos_to_tile($(window).width() - $(window).width() / 6, $(window).height() - height_offset);

    if (ptile1 == null || ptile2 == null || ptile3 == null || ptile4 == null) return;

    drawLine(grid, ptile1['y'], ptile1['x'], ptile2['y'], ptile2['x']);
    drawLine(grid, ptile2['y'], ptile2['x'], ptile4['y'], ptile4['x']);
    drawLine(grid, ptile3['y'], ptile3['x'], ptile4['y'], ptile4['x']);
    drawLine(grid, ptile1['y'], ptile1['x'], ptile3['y'], ptile3['x']);

  }
}

/****************************************************************************
  ...
****************************************************************************/
function drawLine(grid, Sx, Sy, Rx, Ry)
{
  var Ax = Sx * OVERVIEW_TILE_SIZE;
  var Ay = Sy * OVERVIEW_TILE_SIZE;
  var Bx = Rx * OVERVIEW_TILE_SIZE;
  var By = Ry * OVERVIEW_TILE_SIZE;

  var lineLength = Math.sqrt( (Ax-Bx)*(Ax-Bx)+(Ay-By)*(Ay-By));
  for( var i=0; i<lineLength; i++ ) {
    var x = Math.round( Ax+(Bx-Ax)*i/lineLength);
    var y = Math.round( Ay+(By-Ay)*i/lineLength);
    render_singlepixel(grid, x, y, COLOR_OVERVIEW_VIEWRECT);
  }
}

/****************************************************************************
  ...
****************************************************************************/
function render_multipixel(grid, x, y, ocolor)
{
  if (x >= 0 && y >= 0 && x < map['ysize'] && y < map['xsize']) {
    for (var px = 0; px < OVERVIEW_TILE_SIZE; px++) {
      for (var py = 0; py < OVERVIEW_TILE_SIZE; py++) {
          grid[(OVERVIEW_TILE_SIZE*x)+px][(OVERVIEW_TILE_SIZE*y)+py] = ocolor;
      }
    }
  }
}

/****************************************************************************
  ...
****************************************************************************/
function render_singlepixel(grid, x, y, ocolor)
{
  if (x >= 0 && y >= 0 && x < (map['ysize'] * OVERVIEW_TILE_SIZE)
      && y < (map['xsize'] * OVERVIEW_TILE_SIZE)) {
    grid[x][y] = ocolor;
  }
}

/****************************************************************************
  Creates the palette for the overview map.
****************************************************************************/
function generate_palette() {
  var palette = [];
  palette[COLOR_OVERVIEW_UNKNOWN] = [0,0,0];
  palette[COLOR_OVERVIEW_MY_CITY] = [255,255,255];
  palette[COLOR_OVERVIEW_ALLIED_CITY] = [0,255,255];
  palette[COLOR_OVERVIEW_ENEMY_CITY] = [0,255,255];
  palette[COLOR_OVERVIEW_MY_UNIT] = [255,255,0];
  palette[COLOR_OVERVIEW_ALLIED_UNIT] = [255,0,0];
  palette[COLOR_OVERVIEW_ENEMY_UNIT] = [255,0,0];
  palette[COLOR_OVERVIEW_VIEWRECT] = [200,200,255];
  palette_terrain_offset = palette.length;
  for (var terrain_id in terrains) {
    var terrain = terrains[terrain_id];
    palette.push([terrain['color_red'], terrain['color_green'], terrain['color_blue']]);
  }

  palette_color_offset = palette.length;
  var player_count = Object.keys(players).length;

  for (var player_id in players) {
    var pplayer = players[player_id];
    if (pplayer['nation'] == -1) {
      palette[palette_color_offset+(player_id % player_count)] = [0,0,0];
    } else {
      var pcolor = nations[pplayer['nation']]['color'];
      if (pcolor != null) {
        palette[palette_color_offset+(player_id % player_count)] = color_rbg_to_list(pcolor);
      } else {
        palette[palette_color_offset+(player_id % player_count)] = [0,0,0];
      }
    }
  }
  return palette;
}

/****************************************************************************
  Returns the color of the tile at the given map position.
****************************************************************************/
function overview_tile_color(map_x, map_y)
{
  var ptile = map_pos_to_tile(map_x, map_y);

  var pcity = tile_city(ptile);

  if (pcity != null) {
    if (client.conn.playing == null) {
      return COLOR_OVERVIEW_ENEMY_CITY;
    } else if (city_owner_player_id(pcity) == client.conn.playing['id']) {
      return COLOR_OVERVIEW_MY_CITY;
    } else {
      return COLOR_OVERVIEW_ENEMY_CITY;
    }
  }

  var punit = find_visible_unit(ptile);
  if (punit != null) {
    if (client.conn.playing == null) {
      return COLOR_OVERVIEW_ENEMY_UNIT;
    } else if (punit['owner'] == client.conn.playing['id']) {
      return COLOR_OVERVIEW_MY_UNIT;
    } else if (punit['owner'] != null && punit['owner'] != 255) {
      return palette_color_offset + punit['owner'];
    } else {
      return COLOR_OVERVIEW_ENEMY_UNIT;
    }
  }

  if (tile_get_known(ptile) != TILE_UNKNOWN) {
    if (ptile['owner'] != null && ptile['owner'] != 255) {
      return palette_color_offset + ptile['owner'];
    } else {
      return palette_terrain_offset + tile_terrain(ptile)['id'];
    }
  }

  return COLOR_OVERVIEW_UNKNOWN;

}


/****************************************************************************
  ...
****************************************************************************/
function overview_clicked (x, y)
{
  var width = $("#overview_map").width();
  var height = $("#overview_map").height();

  var x1 = Math.floor((x * map['xsize']) / width);
  var y1 = Math.floor((y * map['ysize']) / height);

  var ptile = map_pos_to_tile(x1, y1);
  if (ptile != null) {
    center_tile_mapcanvas(ptile);
  }

  redraw_overview();
}
