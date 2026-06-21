import neo4j, { Driver } from "neo4j-driver";

export const neo4jDriver: Driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || "neo4j",
    process.env.NEO4J_PASSWORD!
  ),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 5000,
    logging: {
      level: "warn",
      logger: (level, message) =>
        console.warn(`[Neo4j ${level}] ${message}`),
    },
  }
);

/**
 * Run a Cypher query and return all results as plain objects.
 */
export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = neo4jDriver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}
