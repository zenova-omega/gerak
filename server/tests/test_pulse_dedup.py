"""Tests for Pulse dedup (SimHash)."""
from app.services.dedup import simhash, hamming, is_near_duplicate


def test_simhash_deterministic():
    a = simhash("TNI gelar bakti sosial di Jakarta")
    b = simhash("TNI gelar bakti sosial di Jakarta")
    assert a == b
    assert len(a) == 16  # 64-bit hex


def test_normalization_makes_near_duplicate():
    # beda kapitalisasi & tanda baca -> token sama -> hamming 0
    a = simhash("TNI Gelar Bakti Sosial!")
    b = simhash("tni gelar bakti sosial")
    assert hamming(a, b) == 0
    assert is_near_duplicate(a, b) is True


def test_distinct_text_not_duplicate():
    a = simhash("TNI gelar bakti sosial di Jakarta")
    b = simhash("Harga kopi lokal naik tajam pekan ini")
    assert hamming(a, b) > 3
    assert is_near_duplicate(a, b) is False


def test_empty_text():
    assert simhash("") == "0" * 16
