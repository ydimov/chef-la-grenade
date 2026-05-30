extends Node2D
## Kitchen Gym — one room to test fast destruction + tactical detonate + chain.

const WP_SCENE_SCRIPT = preload("res://scripts/weak_point.gd")
const RACK_SCENE_SCRIPT = preload("res://scripts/chain_prop.gd")

@onready var player: CharacterBody2D = $Player
@onready var camera: Camera2D = $TacticalCamera
@onready var ui_layer: CanvasLayer = $UI

var _spawn_point: Vector2 = Vector2(120, 420)
var _shake_strength: float = 0.0
var _weak_floor: StaticBody2D
var _weak_wall: StaticBody2D
var _chain_rack: StaticBody2D
var _hint: Label
var _complete: bool = false


func _ready() -> void:
	add_to_group("kitchen_gym")
	_build_level()
	_setup_ui()
	_reset_player()


func _process(delta: float) -> void:
	if Input.is_action_just_pressed("restart"):
		get_tree().reload_current_scene()
	if _shake_strength > 0.0 and camera:
		_shake_strength = move_toward(_shake_strength, 0.0, delta * 24.0)
		camera.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * _shake_strength
	elif camera:
		camera.offset = Vector2.ZERO
	if GameGlobals.consume_hit_stop():
		Engine.time_scale = 0.001
	elif Engine.time_scale < 1.0:
		Engine.time_scale = 1.0
	# Highlight weak points in tactical view
	var tactical := GameGlobals.tactical_view_active
	for wp in get_tree().get_nodes_in_group("weak_points"):
		if wp.has_method("is_intact") and wp.is_intact():
			wp.pulse_weak_hint(tactical)


func camera_shake(amount: float) -> void:
	_shake_strength = maxf(_shake_strength, amount)


func on_weak_point_broken(wp: Node, _source: String) -> void:
	if wp == _weak_floor:
		_open_floor_gap()
	if wp == _weak_wall and not _complete:
		_complete = true
		_show_message("Route open! R to restart.")


func _reset_player() -> void:
	if player and player.has_method("reset_to"):
		player.reset_to(_spawn_point)


func _open_floor_gap() -> void:
	var gap := get_node_or_null("Level/FloorGap")
	if gap:
		gap.visible = false
		var col := gap.get_node_or_null("CollisionShape2D") as CollisionShape2D
		if col:
			col.set_deferred("disabled", true)


func _build_level() -> void:
	var level := Node2D.new()
	level.name = "Level"
	add_child(level)
	move_child(level, 0)

	# Back wall aesthetic
	_add_rect(level, Vector2(0, 80), Vector2(1400, 560), Color(0.93, 0.9, 0.82))
	_add_rect(level, Vector2(0, 0), Vector2(1400, 90), Color(0.55, 0.75, 0.85)) # sky/upper wall

	# Main floor (left start)
	_add_platform(level, Vector2(0, 480), Vector2(520, 80), Color(0.35, 0.32, 0.28))

	# Breakable floor section (center)
	_weak_floor = _add_weak_point(level, Vector2(520, 456), Vector2(160, 24), "floor_break", false)

	# Lower floor (after drop)
	_add_platform(level, Vector2(480, 620), Vector2(400, 60), Color(0.4, 0.36, 0.3))

	# One-way platform to practice drop
	_add_one_way(level, Vector2(200, 380), Vector2(140, 16))

	# Right mid platform (plant zone)
	_add_platform(level, Vector2(700, 520), Vector2(200, 40), Color(0.45, 0.4, 0.35))

	# Gap filler under breakable floor (blocks until broken)
	var floor_gap := StaticBody2D.new()
	floor_gap.name = "FloorGap"
	floor_gap.position = Vector2(520, 480)
	var gap_shape := CollisionShape2D.new()
	var gap_rect := RectangleShape2D.new()
	gap_rect.size = Vector2(160, 40)
	gap_shape.shape = gap_rect
	floor_gap.add_child(gap_shape)
	floor_gap.collision_layer = 2
	level.add_child(floor_gap)
	var gap_vis := ColorRect.new()
	gap_vis.size = Vector2(160, 40)
	gap_vis.color = Color(0.3, 0.28, 0.25)
	floor_gap.add_child(gap_vis)

	# Chain rack (lower area)
	_chain_rack = _add_chain_rack(level, Vector2(560, 592))

	# Weak wall blocking exit (requires chain)
	_weak_wall = _add_weak_point(level, Vector2(960, 500), Vector2(24, 120), "wall_exit", true)
	_chain_rack.chain_targets = [_chain_rack.get_path_to(_weak_wall)]

	# Exit platform beyond wall
	_add_platform(level, Vector2(1000, 560), Vector2(360, 80), Color(0.5, 0.75, 0.45))
	_add_rect(level, Vector2(1040, 480), Vector2(80, 80), Color(0.2, 0.6, 0.35)) # goal marker

	# Left wall boundary
	_add_platform(level, Vector2(-40, 0), Vector2(40, 720), Color(0.25, 0.22, 0.2))
	# Right boundary far
	_add_platform(level, Vector2(1360, 0), Vector2(40, 720), Color(0.25, 0.22, 0.2))


func _add_platform(parent: Node2D, pos: Vector2, size: Vector2, color: Color) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.position = pos
	body.collision_layer = 2
	var col := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	col.shape = shape
	col.position = size * 0.5
	body.add_child(col)
	var vis := ColorRect.new()
	vis.size = size
	vis.color = color
	body.add_child(vis)
	parent.add_child(body)
	return body


func _add_one_way(parent: Node2D, pos: Vector2, size: Vector2) -> StaticBody2D:
	var body := _add_platform(parent, pos, size, Color(0.55, 0.5, 0.45))
	body.collision_layer = 4
	var col := body.get_child(0) as CollisionShape2D
	if col:
		col.one_way_collision = true
	return body


func _add_rect(parent: Node2D, pos: Vector2, size: Vector2, color: Color) -> ColorRect:
	var r := ColorRect.new()
	r.position = pos
	r.size = size
	r.color = color
	parent.add_child(r)
	return r


func _add_weak_point(parent: Node2D, pos: Vector2, size: Vector2, id: String, chain_only: bool) -> StaticBody2D:
	var wp: StaticBody2D = WP_SCENE_SCRIPT.new()
	wp.name = "WeakPoint_%s" % id
	wp.position = pos
	wp.point_id = id
	wp.requires_chain = chain_only
	var col := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	col.shape = shape
	col.position = size * 0.5
	wp.add_child(col)
	var vis := ColorRect.new()
	vis.name = "Visual"
	vis.size = size
	vis.position = Vector2.ZERO
	wp.add_child(vis)
	var outline := ColorRect.new()
	outline.name = "Outline"
	outline.size = size + Vector2(6, 6)
	outline.position = Vector2(-3, -3)
	outline.color = Color(0.1, 0.1, 0.15, 0.7)
	wp.add_child(outline)
	outline.z_index = -1
	parent.add_child(wp)
	return wp


func _add_chain_rack(parent: Node2D, pos: Vector2) -> StaticBody2D:
	var rack: StaticBody2D = RACK_SCENE_SCRIPT.new()
	rack.name = "ChainRack"
	rack.position = pos
	var col := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(48, 40)
	col.shape = shape
	col.position = Vector2(24, 20)
	rack.add_child(col)
	var vis := ColorRect.new()
	vis.name = "Visual"
	vis.size = Vector2(48, 40)
	vis.color = Color(0.7, 0.25, 0.15)
	rack.add_child(vis)
	var label := Label.new()
	label.text = "Rack"
	label.position = Vector2(4, 10)
	label.add_theme_font_size_override("font_size", 12)
	rack.add_child(label)
	parent.add_child(rack)
	return rack


func _setup_ui() -> void:
	_hint = Label.new()
	_hint.name = "Hint"
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_hint.offset_top = -120
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint.add_theme_font_size_override("font_size", 15)
	_hint.text = "Move A/D | Jump Space/Z | Roll Shift/X | Throw J/LMB | Plant K/RMB | Detonate E | Tactical Tab/Q | Drop S+Down | Restart R"
	_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ui_layer.add_child(_hint)


func _show_message(text: String) -> void:
	if _hint:
		_hint.text = text
		_hint.modulate = Color(0.5, 1.0, 0.6)
