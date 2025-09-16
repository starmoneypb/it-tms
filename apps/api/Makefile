MIGRATE= $(HOME)/go/bin/migrate
DB_URL?= $(DATABASE_URL)
MIGRATIONS_PATH=../../db/migrations

.PHONY: migrate-up migrate-down seed test run setup-db

migrate-up:
	$(MIGRATE) -database "$(DB_URL)" -path $(MIGRATIONS_PATH) up

migrate-down:
	$(MIGRATE) -database "$(DB_URL)" -path $(MIGRATIONS_PATH) down 1

seed:
	go run ./cmd/seed/main.go

test:
	go test ./... -v

run:
	go run ./cmd/server/main.go

setup-db:
	@echo "Setting up database..."
	@echo "Applying migrations..."
	psql "$(DB_URL)" -f $(MIGRATIONS_PATH)/0001_init.up.sql
	psql "$(DB_URL)" -f $(MIGRATIONS_PATH)/0002_indexes.up.sql
	@echo "Seeding database..."
	$(MAKE) seed
	@echo "Database setup complete!"