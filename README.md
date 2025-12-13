# ekidata

Japanese railway data from ekidata.jp CSV files parsed into a SQL database.

## Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run start
```

## Database

Push the schema to the database:

```bash
bun run db:push
```

Other database commands:

- `bun run db:generate` - Generate migrations
- `bun run db:migrate` - Run migrations
- `bun run db:studio` - Open Drizzle Studio

## Data source & attribution

This project uses Japanese station/railway data from **[駅データ](ekidata.jp)**.

- Source: https://www.ekidata.jp/
- Download page: https://www.ekidata.jp/dl/
- Terms of use: https://www.ekidata.jp/agreement.php
