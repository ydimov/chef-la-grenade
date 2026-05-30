extends Node
## Autoload: armed bombs registry, tactical mode, juice helpers.

signal armed_bombs_changed(count: int)
signal tactical_view_changed(active: bool)

var armed_bombs: Array[Node] = []
var tactical_view_active: bool = false
var hit_stop_requested: bool = false

const HIT_STOP_FRAMES: int = 2


func register_armed_bomb(bomb: Node) -> void:
	if bomb in armed_bombs:
		return
	armed_bombs.append(bomb)
	armed_bombs_changed.emit(armed_bombs.size())


func unregister_armed_bomb(bomb: Node) -> void:
	if not bomb in armed_bombs:
		return
	armed_bombs.erase(bomb)
	armed_bombs_changed.emit(armed_bombs.size())


func set_tactical_view(active: bool) -> void:
	if tactical_view_active == active:
		return
	tactical_view_active = active
	tactical_view_changed.emit(active)


func detonate_all() -> void:
	var bombs: Array[Node] = []
	for bomb in armed_bombs:
		if is_instance_valid(bomb):
			bombs.append(bomb)
	for bomb in bombs:
		if bomb.has_method("detonate"):
			bomb.detonate()


func request_hit_stop() -> void:
	hit_stop_requested = true


func consume_hit_stop() -> bool:
	if hit_stop_requested:
		hit_stop_requested = false
		return true
	return false
