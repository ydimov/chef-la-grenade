extends CharacterBody2D
class_name Player
## Tight platformer controller + bomb verbs.

const BOMB_PLANT_SCRIPT = preload("res://scripts/planted_bomb.gd")

const SPEED: float = 280.0
const ACCEL: float = 2200.0
const FRICTION: float = 1800.0
const JUMP_VELOCITY: float = -420.0
const COYOTE_TIME: float = 0.1
const JUMP_BUFFER: float = 0.12
const ROLL_SPEED: float = 420.0
const ROLL_DURATION: float = 0.28
const GRAVITY: float = 1200.0
const MAX_FALL: float = 700.0
const THROW_COOLDOWN: float = 0.35
const PLANT_COOLDOWN: float = 0.4

@onready var bomb_spawn: Marker2D = $BombSpawn
@onready var visual: ColorRect = $Visual

var _coyote_timer: float = 0.0
var _jump_buffer_timer: float = 0.0
var _facing: float = 1.0
var _rolling: bool = false
var _roll_timer: float = 0.0
var _throw_cd: float = 0.0
var _plant_cd: float = 0.0
var _frozen: bool = false
var _one_way_mask: int = 4

var throwable_scene: PackedScene


func _ready() -> void:
	add_to_group("player")
	collision_layer = 1
	collision_mask = 2 + 4 + 8
	throwable_scene = preload("res://scenes/throwable_bomb.tscn")


func _physics_process(delta: float) -> void:
	if _frozen:
		return
	_update_timers(delta)
	if GameGlobals.tactical_view_active:
		velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta * 2.0)
		velocity.y = minf(velocity.y + GRAVITY * delta, MAX_FALL)
		move_and_slide()
		return
	_apply_gravity(delta)
	if _rolling:
		_process_roll(delta)
	else:
		_process_movement(delta)
	_process_jump()
	move_and_slide()
	_update_facing()
	_handle_actions()


func set_frozen(frozen: bool) -> void:
	_frozen = frozen


func _update_timers(delta: float) -> void:
	_throw_cd = maxf(0.0, _throw_cd - delta)
	_plant_cd = maxf(0.0, _plant_cd - delta)
	if is_on_floor():
		_coyote_timer = COYOTE_TIME
	else:
		_coyote_timer = maxf(0.0, _coyote_timer - delta)
	if Input.is_action_just_pressed("jump"):
		_jump_buffer_timer = JUMP_BUFFER
	else:
		_jump_buffer_timer = maxf(0.0, _jump_buffer_timer - delta)


func _apply_gravity(delta: float) -> void:
	if not is_on_floor():
		velocity.y = minf(velocity.y + GRAVITY * delta, MAX_FALL)


func _process_movement(delta: float) -> void:
	var direction := Input.get_axis("move_left", "move_right")
	if direction != 0.0:
		_facing = signf(direction)
	if Input.is_action_just_pressed("roll") and is_on_floor():
		_start_roll()
		return
	if Input.is_action_pressed("drop_through"):
		collision_mask = 2 + 8 # ignore one-way while dropping
	else:
		collision_mask = 2 + 4 + 8
	if direction != 0.0:
		velocity.x = move_toward(velocity.x, direction * SPEED, ACCEL * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta)


func _start_roll() -> void:
	_rolling = true
	_roll_timer = ROLL_DURATION
	velocity.x = _facing * ROLL_SPEED
	velocity.y = 0.0
	if visual:
		visual.color = Color(0.6, 0.15, 0.2)


func _process_roll(delta: float) -> void:
	_roll_timer -= delta
	velocity.x = _facing * ROLL_SPEED
	if _roll_timer <= 0.0:
		_rolling = false
		if visual:
			visual.color = Color(0.85, 0.15, 0.2)


func _process_jump() -> void:
	if _jump_buffer_timer > 0.0 and _coyote_timer > 0.0:
		velocity.y = JUMP_VELOCITY
		_jump_buffer_timer = 0.0
		_coyote_timer = 0.0


func _update_facing() -> void:
	if visual and _facing < 0.0:
		visual.scale.x = -1.0
	elif visual:
		visual.scale.x = 1.0


func _handle_actions() -> void:
	if Input.is_action_just_pressed("throw_bomb"):
		_throw_grenade()
	if Input.is_action_just_pressed("plant_bomb"):
		_plant_charge()
	if Input.is_action_just_pressed("detonate"):
		GameGlobals.detonate_all()


func _throw_grenade() -> void:
	if _throw_cd > 0.0 or throwable_scene == null:
		return
	_throw_cd = THROW_COOLDOWN
	var bomb = throwable_scene.instantiate()
	get_tree().current_scene.add_child(bomb)
	var origin := bomb_spawn.global_position if bomb_spawn else global_position
	bomb.launch(origin, _facing)


func _plant_charge() -> void:
	if _plant_cd > 0.0:
		return
	var space := get_world_2d().direct_space_state
	var from := global_position
	var to := from + Vector2(_facing * 28.0, 8.0)
	var query := PhysicsRayQueryParameters2D.create(from, to)
	query.collision_mask = 2 + 8
	query.exclude = [get_rid()]
	var hit := space.intersect_ray(query)
	if hit.is_empty():
		# Plant at feet on floor
		if is_on_floor():
			_spawn_planted(global_position + Vector2(_facing * 16.0, -4.0))
			_plant_cd = PLANT_COOLDOWN
		return
	var normal: Vector2 = hit.normal
	var pos: Vector2 = hit.position + normal * 6.0
	_spawn_planted(pos)
	_plant_cd = PLANT_COOLDOWN


func _spawn_planted(pos: Vector2) -> void:
	var planted = BOMB_PLANT_SCRIPT.new()
	planted.global_position = pos
	get_tree().current_scene.add_child(planted)


func reset_to(spawn: Vector2) -> void:
	global_position = spawn
	velocity = Vector2.ZERO
	_rolling = false
	_frozen = false
