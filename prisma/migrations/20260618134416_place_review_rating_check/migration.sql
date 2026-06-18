-- Enforce rating 1..5 at the database level (design: docs/DATABASE.md §4)
ALTER TABLE "PlaceReview"
  ADD CONSTRAINT "PlaceReview_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
