extends StaticBody2D
class_name WeakPoint
## One-shot destructible surface. Emits broken when destroyed.

signal broken(weak_point: Node)

@export var point_id: String = ""
@export var requires_chain: bool = false

var _intact: bool = true
var _visual: ColorRect
var _collision: CollisionShape2D
var _outline: ColorRect


func _ready() -> void:
	add_to_group("weak_points")
	collision_layer = 8 # weak_point
	collision_mask = 0
	_build_visual()


func _build_visual() -> void:
	_collision = get_node_or_null("CollisionShape2D") as CollisionShape2D
	_visual = get_node_or_null("Visual") as ColorRect
	_outline = get_node_or_null("Outline") as ColorRect
	if _visual:
		_visual.color = Color(0.95, 0.55, 0.15, 1.0) if not requires_chain else Color(0.75, 0.35, 0.9, 1.0)
	if _outline:
		_outline.color = Color(0.1, 0.1, 0.15, 0.85)


func is_intact() -> bool:
	return _intact


func can_break_from_direct_hit() -> bool:
	return _intact and not requires_chain


func break_point(source: String = "bomb") -> void:
	if not _intact:
		return
	_intact = false
	if _collision:
		_collision.set_deferred("disabled", true)
	if _visual:
		var tween := create_tween()
		tween.tween_property(_visual, "modulate:a", 0.0, 0.12)
	if _outline:
		_outline.visible = false
	GameGlobals.request_hit_stop()
	broken.emit(self)
	var gym := get_tree().get_first_node_in_group("kitchen_gym")
	if gym and gym.has_method("on_weak_point_broken"):
		gym.on_weak_point_broken(self, source)


func pulse_weak_hint(active: bool) -> void:
	if _outline and _intact:
		_outline.modulate = Color(1.4, 1.2, 0.5) if active else Color.WHITE
