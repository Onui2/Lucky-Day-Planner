CREATE TABLE "share_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"public_payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_snapshots" ADD CONSTRAINT "share_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "share_snapshots_token_hash_uidx" ON "share_snapshots" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "share_snapshots_user_created_idx" ON "share_snapshots" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "share_snapshots_expires_idx" ON "share_snapshots" USING btree ("expires_at");
