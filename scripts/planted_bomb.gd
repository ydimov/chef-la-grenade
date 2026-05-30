extends Node2D
class_name PlantedBomb
## Pressure Cooker — sticks to surface, detonates remotely.

signal detonated(bomb: Node)

const BLAST_RADIUS: float = 56.0

var _armed: bool = true
var _pulse_tween: Tween
var _icon: ColorRect


func _ready() -> void:
	add_to_group("armed_bombs")
	GameGlobals.register_armed_bomb(self)
	_build_visual()
	_start_pulse()


func _build_visual() -> void:
	_icon = ColorRect.new()
	_icon.size = Vector2(20, 20)
	_icon.position = Vector2(-10, -10)
	_icon.color = Color(0.9, 0.2, 0.25, 1.0)
	add_child(_icon)
	var ring := ColorRect.new()
	ring.name = "Ring"
	ring.size = Vector2(28, 28)
	ring.position = Vector2(-14, -14)
	ring.color = Color(1.0, 0.85, 0.2, 0.35)
	add_child(ring)
	move_child(ring, 0)


func _start_pulse() -> void:
	_pulse_tween = create_tween().set_loops()
	_pulse_tween.tween_property(self, "scale", Vector2(1.15, 1.15), 0.35)
	_pulse_tween.tween_property(self, "scale", Vector2.ONE, 0.35)


func detonate() -> void:
	if not _armed:
		return
	_armed = false
	if _pulse_tween:
		_pulse_tween.kill()
	GameGlobals.unregister_armed_bomb(self)
	_do_blast()
	detonated.emit(self)
	queue_free()


func _do_blast() -> void:
	GameGlobals.request_hit_stop()
	var space := get_world_2d().direct_space_state
	var shape := CircleShape2D.new()
	shape.radius = BLAST_RADIUS
	var query := PhysicsShapeQueryParameters2D.new()
	query.shape = shape
	query.transform = Transform2D(0.0, global_position)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	query.collision_mask = 8 + 32 + 2 # weak, chain_prop, world
	var results := space.intersect_shape(query, 16)
	for result in results:
		var collider: Object = result.collider
		if collider.is_in_group("weak_points"):
			collider.break_point("blast")
		elif collider.has_method("trigger_chain"):
			collider.trigger_chain()
		elif collider.get_parent() and collider.get_parent().has_method("trigger_chain"):
			collider.get_parent().trigger_chain()
	# Visual
	var flash := ColorRect.new()
	flash.color = Color(1.0, 0.45, 0.15, 0.85)
	flash.size = Vector2(BLAST_RADIUS * 2.0, BLAST_RADIUS * 2.0)
	flash.position = global_position - Vector2(BLAST_RADIUS, BLAST_RADIUS)
	get_tree().current_scene.add_child(flash)
	var tween := flash.create_tween()
	tween.tween_property(flash, "modulate:a", 0.0, 0.2)
	tween.tween_callback(flash.queue_free)
	# Camera shake via gym
	var gym := get_tree().get_first_node_in_group("kitchen_gym")
	if gym and gym.has_method("camera_shake"):
		gym.camera_shake(4.0)


func get_tactical_color() -> Color:
	return Color(1.0, 0.35, 0.35, 0.95)
