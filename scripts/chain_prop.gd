extends StaticBody2D
class_name ChainProp
## Barrel rack / prop — when blasted, triggers linked weak points.

signal triggered(prop: Node)

@export var chain_targets: Array = []

var _triggered: bool = false
var _visual: ColorRect


func _ready() -> void:
	collision_layer = 32 # chain_prop
	collision_mask = 0
	add_to_group("chain_props")
	_visual = get_node_or_null("Visual") as ColorRect


func trigger_chain() -> void:
	if _triggered:
		return
	_triggered = true
	GameGlobals.request_hit_stop()
	if _visual:
		var tween := create_tween()
		tween.tween_property(_visual, "modulate", Color(1.5, 0.4, 0.2), 0.08)
		tween.tween_property(_visual, "modulate:a", 0.0, 0.2)
	triggered.emit(self)
	for path in chain_targets:
		var node := get_node_or_null(path)
		if node and node.has_method("break_point"):
			node.break_point("chain")
	# Small delay knock for readability
	await get_tree().create_timer(0.08).timeout
	if _visual:
		_visual.visible = false
	var col := get_node_or_null("CollisionShape2D") as CollisionShape2D
	if col:
		col.set_deferred("disabled", true)
