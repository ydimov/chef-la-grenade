extends Area2D
class_name ThrowableBomb
## La Grenade — arcing throw, instant break on weak points.

const GRAVITY: float = 900.0
const SPEED: float = 520.0

var _velocity: Vector2 = Vector2.ZERO
var _armed: bool = true


func _ready() -> void:
	collision_layer = 16 # bomb
	collision_mask = 8 + 2 # weak_point + world
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)


func launch(from: Vector2, direction: float) -> void:
	global_position = from
	_velocity = Vector2(direction * SPEED, -320.0)
	rotation = 0.0


func _physics_process(delta: float) -> void:
	if not _armed:
		return
	_velocity.y += GRAVITY * delta
	global_position += _velocity * delta
	rotation += delta * 8.0


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("weak_points"):
		if body.can_break_from_direct_hit():
			body.break_point("throw")
			_explode_visual()
	elif body is StaticBody2D:
		_explode_visual()


func _on_area_entered(area: Area2D) -> void:
	var parent := area.get_parent()
	if parent and parent.is_in_group("weak_points"):
		if parent.can_break_from_direct_hit():
			parent.break_point("throw")
			_explode_visual()


func _explode_visual() -> void:
	if not _armed:
		return
	_armed = false
	GameGlobals.request_hit_stop()
	var flash := ColorRect.new()
	flash.color = Color(1.0, 0.7, 0.2, 0.9)
	flash.size = Vector2(32, 32)
	flash.position = global_position - flash.size * 0.5
	get_tree().current_scene.add_child(flash)
	var tween := flash.create_tween()
	tween.tween_property(flash, "modulate:a", 0.0, 0.15)
	tween.tween_callback(flash.queue_free)
	queue_free()
