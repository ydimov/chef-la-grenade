extends Camera2D
class_name TacticalCamera
## Pull-back tactical view while held; highlights armed bombs.

@export var normal_zoom: Vector2 = Vector2(1.35, 1.35)
@export var tactical_zoom: Vector2 = Vector2(0.72, 0.72)
@export var zoom_lerp_speed: float = 12.0

var _target_zoom: Vector2
var _overlay: CanvasLayer
var _hint_label: Label
var _armed_label: Label


func _ready() -> void:
	make_current()
	_target_zoom = normal_zoom
	zoom = normal_zoom
	position_smoothing_enabled = true
	position_smoothing_speed = 10.0
	_build_overlay()
	GameGlobals.tactical_view_changed.connect(_on_tactical_changed)
	GameGlobals.armed_bombs_changed.connect(_on_armed_changed)


func _build_overlay() -> void:
	_overlay = CanvasLayer.new()
	_overlay.layer = 10
	_overlay.visible = false
	add_child(_overlay)
	var panel := ColorRect.new()
	panel.color = Color(0.05, 0.08, 0.12, 0.35)
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(panel)
	_hint_label = Label.new()
	_hint_label.text = "TACTICAL — E to detonate all"
	_hint_label.position = Vector2(24, 16)
	_hint_label.add_theme_font_size_override("font_size", 20)
	_hint_label.modulate = Color(1.0, 0.9, 0.6)
	_overlay.add_child(_hint_label)
	_armed_label = Label.new()
	_armed_label.position = Vector2(24, 48)
	_armed_label.add_theme_font_size_override("font_size", 16)
	_overlay.add_child(_armed_label)
	_on_armed_changed(GameGlobals.armed_bombs.size())


func _process(delta: float) -> void:
	var player := get_parent().get_node_or_null("Player") as Node2D
	if player:
		global_position = player.global_position + Vector2(0, -40)
	var tactical := Input.is_action_pressed("tactical_view") and not _is_player_dead()
	GameGlobals.set_tactical_view(tactical)
	_target_zoom = tactical_zoom if tactical else normal_zoom
	zoom = zoom.lerp(_target_zoom, zoom_lerp_speed * delta)
	_overlay.visible = tactical
	if tactical:
		_pulse_armed_bombs(delta)


func _is_player_dead() -> bool:
	return false


func _on_tactical_changed(_active: bool) -> void:
	pass


func _on_armed_changed(count: int) -> void:
	if _armed_label:
		_armed_label.text = "Armed charges: %d" % count


func _pulse_armed_bombs(_delta: float) -> void:
	for bomb in GameGlobals.armed_bombs:
		if is_instance_valid(bomb) and bomb.is_in_group("armed_bombs"):
			var icon := bomb.get_node_or_null("Visual") if bomb.has_node("Visual") else null
			if icon == null and bomb.get_child_count() > 0:
				for child in bomb.get_children():
					if child is ColorRect:
						child.modulate = Color(1.5, 1.2, 0.5) if int(Time.get_ticks_msec() / 200) % 2 == 0 else Color.WHITE
