"""Тесты логики: геометрия, срабатывание остановок, сход с маршрута, поездки.

Запуск: python -m pytest  (из папки python)
"""

import math

import pytest

from app.data.route import ROUTE_POINTS
from app.data.route_shape import ROUTE_SHAPE
from app.format import format_distance, format_duration, format_rate, format_time
from app.geometry import (
    ROUTE_LENGTH,
    STOP_ALONG,
    distance_in_meters,
    find_nearest_stop,
    find_next_stop,
    point_at_along,
    project_on_route,
)
from app.demo import BUS_SPEED, DEMO_SPEEDS, MAX_STEP_METERS, tick_seconds
from app.settings import TRIP_GAP_MS, Trip, next_trip
from app.tracking import RouteTracker, TrackingState


def test_route_data():
    assert len(ROUTE_POINTS) == 29
    assert [p.order for p in ROUTE_POINTS] == list(range(1, 30))
    assert all(p.audio_ru for p in ROUTE_POINTS)
    assert len(ROUTE_SHAPE) > 100


def test_route_length_about_34_km():
    assert 30_000 < ROUTE_LENGTH < 40_000


def test_stops_go_along_the_route_in_order():
    along = [a for a in STOP_ALONG if a is not None]
    assert along == sorted(along)
    assert along[0] < 50
    # После метро линия делает разворотную петлю ~900 м
    assert ROUTE_LENGTH - 1500 < along[-1] < ROUTE_LENGTH


def test_projection_of_a_stop_is_on_the_line():
    p = ROUTE_POINTS[10]
    projection = project_on_route(p.latitude, p.longitude)
    assert projection.offset < 60


def test_projection_far_away():
    # Центр Петербурга — далеко от маршрута
    assert project_on_route(59.9386, 30.3141).offset > 5000


def test_distance_one_degree_latitude():
    assert distance_in_meters(59, 30, 60, 30) == pytest.approx(111_195, rel=0.001)


def test_next_stop_depends_on_direction():
    along = (STOP_ALONG[5] + STOP_ALONG[6]) / 2
    assert find_next_stop(along, 1).index == 6
    assert find_next_stop(along, -1).index == 5
    assert find_next_stop(ROUTE_LENGTH + 10, 1) is None


def test_nearest_stop():
    p = ROUTE_POINTS[20]
    nearest = find_nearest_stop(p.latitude + 0.0005, p.longitude)
    assert nearest.index == 20
    assert nearest.distance == pytest.approx(55.6, abs=1)


def test_format():
    assert format_time(0) == "0:00"
    assert format_time(75.9) == "1:15"
    assert format_distance(450.5) == "451 м"
    assert format_distance(1234) == "1,2 км"
    assert format_duration(30) == "1 мин"
    assert format_duration(3 * 3600 + 5 * 60) == "3 ч 5 мин"
    assert format_rate(1.25) == "1,25×"
    assert format_rate(2.0) == "2×"


# --- слежение за поездкой ---


def point_along(meters: float, sideways: float = 0.0) -> tuple[float, float]:
    """Точка на линии маршрута в `meters` от начала, сдвинутая вбок на `sideways` м."""
    total = 0.0
    for (lat1, lon1), (lat2, lon2) in zip(ROUTE_SHAPE, ROUTE_SHAPE[1:]):
        segment = distance_in_meters(lat1, lon1, lat2, lon2)
        if total + segment >= meters:
            t = (meters - total) / segment
            lat = lat1 + (lat2 - lat1) * t
            lon = lon1 + (lon2 - lon1) * t
            # Перпендикуляр к отрезку
            dy = (lat2 - lat1) * 111_320
            dx = (lon2 - lon1) * 111_320 * math.cos(math.radians(lat))
            n = math.hypot(dx, dy)
            lat += (dx / n) * sideways / 111_320
            lon += (-dy / n) * sideways / (111_320 * math.cos(math.radians(lat)))
            return lat, lon
        total += segment
    return ROUTE_SHAPE[-1]


class Recorder:
    def __init__(self, trigger=120):
        self.state = TrackingState()
        self.events: list = []
        self.tracker = RouteTracker(
            self.state,
            trigger_distance=lambda: trigger,
            on_stop_reached=lambda i, d: self.events.append(("stop", i, d)),
            on_left_route=lambda: self.events.append(("left",)),
            on_returned_to_route=lambda: self.events.append(("back",)),
        )

    def at(self, meters, sideways=0.0, accuracy=10.0, speed=10.0):
        lat, lon = point_along(meters, sideways)
        self.tracker.handle_location(lat, lon, accuracy, speed)


def test_ride_triggers_every_stop_once_in_order():
    r = Recorder()
    for meters in range(0, int(ROUTE_LENGTH), 20):
        r.at(meters)

    stops = [e[1] for e in r.events if e[0] == "stop"]
    assert stops == list(range(29))
    assert r.state.status == "on-route"
    assert r.state.direction == 1


def test_ride_backwards_has_direction_minus_one():
    r = Recorder()
    for meters in range(int(ROUTE_LENGTH), 0, -20):
        r.at(meters)

    stops = [e for e in r.events if e[0] == "stop"]
    assert [e[1] for e in stops] == list(range(28, -1, -1))
    assert stops[-1][2] == -1


def test_starting_far_away_is_off_route_without_announcement():
    r = Recorder()
    r.at(5000, sideways=2000)
    assert r.state.status == "off-route"
    assert r.events == []


def test_leaving_route_needs_three_fixes_and_return_is_announced():
    r = Recorder()
    r.at(5000)
    r.at(5020, sideways=600)
    r.at(5040, sideways=600)
    assert r.state.status == "on-route"
    r.at(5060, sideways=600)
    assert r.state.status == "off-route"
    assert ("left",) in r.events

    r.at(5080)
    assert r.state.status == "on-route"
    # Сначала «снова на маршруте», потом — рассказ о ближайшей остановке
    assert r.events[-2:] == [("back",), ("stop", 10, 1)]


def test_inaccurate_fix_is_ignored():
    r = Recorder()
    r.at(STOP_ALONG[3], accuracy=200)
    assert r.state.status == "searching"
    assert r.events == []


def test_trigger_distance_changes_when_story_starts():
    stop_along = STOP_ALONG[10]

    early = Recorder(trigger=250)
    early.at(stop_along - 200, accuracy=5)
    assert ("stop", 10, 1) in early.events

    late = Recorder(trigger=50)
    late.at(stop_along - 200, accuracy=5)
    assert late.events == []


# --- поездки ---


def test_trip_plays_each_stop_once():
    trip = next_trip(Trip(), 3, 1, now_ms=1_000)
    assert trip.played == [3]
    assert next_trip(trip, 3, 1, now_ms=2_000) is None


def test_new_trip_after_long_pause_or_turning_back():
    trip = Trip(played=[3], direction=1, updated_at=1_000)
    assert next_trip(trip, 3, 1, now_ms=1_000 + TRIP_GAP_MS + 1).played == [3]
    assert next_trip(trip, 3, -1, now_ms=2_000).played == [3]


# --- демо-поездка ---


def test_point_at_along_lies_on_route():
    for along in [0, 1234.5, ROUTE_LENGTH / 2, ROUTE_LENGTH - 10, ROUTE_LENGTH]:
        lat, lon = point_at_along(along)
        projection = project_on_route(lat, lon)
        assert projection.offset < 1
        assert projection.along == pytest.approx(along, abs=1)


def test_point_at_along_clamps_to_route_ends():
    assert point_at_along(-100) == pytest.approx(tuple(ROUTE_SHAPE[0]))
    assert point_at_along(ROUTE_LENGTH + 100) == pytest.approx(tuple(ROUTE_SHAPE[-1]))


def test_demo_step_never_skips_a_stop():
    # Окно срабатывания при «У остановки» — 50 м в каждую сторону, шаг меньше
    for speed in DEMO_SPEEDS:
        step = BUS_SPEED * speed * tick_seconds(speed)
        assert step <= MAX_STEP_METERS + 1e-9
        assert tick_seconds(speed) <= 1


def test_demo_ride_triggers_every_stop_in_order():
    reached = []
    tracker = RouteTracker(
        TrackingState(),
        trigger_distance=lambda: 50,
        on_stop_reached=lambda index, direction: reached.append((index, direction)),
        on_left_route=lambda: None,
        on_returned_to_route=lambda: None,
    )
    speed = max(DEMO_SPEEDS)
    step = BUS_SPEED * speed * tick_seconds(speed)
    along = 0.0
    while True:
        lat, lon = point_at_along(along)
        tracker.handle_location(lat, lon, 5, BUS_SPEED * speed)
        if along >= ROUTE_LENGTH:
            break
        along = min(along + step, ROUTE_LENGTH)

    assert [index for index, _ in reached] == list(range(len(ROUTE_POINTS)))
    assert all(direction == 1 for _, direction in reached[1:])


# --- куда смотреть ---


def test_look_side_values():
    assert {p.look_side for p in ROUTE_POINTS} <= {"left", "right", "ahead", None}


def test_look_hint_flips_on_way_back():
    from app.format import look_hint

    assert look_hint(None, 1) is None
    assert look_hint("left", 1) == ("←", "Смотрите в левое окно")
    assert look_hint("left", -1) == ("→", "Смотрите в правое окно")
    assert look_hint("right", 1) == ("→", "Смотрите в правое окно")
    assert look_hint("right", -1) == ("←", "Смотрите в левое окно")
    assert look_hint("ahead", -1) == ("↑", "Смотрите вперёд")


# --- поиск остановки ---


def test_matches_search():
    from app.format import matches_search

    assert matches_search("Метро «Проспект Ветеранов»", "")
    assert matches_search("Метро «Проспект Ветеранов»", "  ветеранов ")
    assert matches_search("Рогачёвский переулок", "рогачев")
    assert matches_search("Метро «Проспект Ветеранов»", "«проспект")
    assert not matches_search("Улица Связи", "стрельна")
    assert sum(matches_search(p.name, "федюнинского") for p in ROUTE_POINTS) == 3
