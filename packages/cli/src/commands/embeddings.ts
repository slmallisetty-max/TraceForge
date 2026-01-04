import { Command } from "commander";
import chalk from "chalk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const embeddingsCommand = new Command("embeddings").description(
  "Manage embedding models for semantic assertions"
);

embeddingsCommand
  .command("setup-ollama")
  .description("Install and configure Ollama for local embeddings")
  .action(async () => {
    console.log(chalk.bold("\n🦙 Setting up Ollama for local embeddings...\n"));

    try {
      // Check if Ollama is installed
      try {
        const { stdout } = await execAsync("ollama --version");
        console.log(
          chalk.green(`✓ Ollama is already installed: ${stdout.trim()}`)
        );
      } catch {
        console.log(
          chalk.yellow(
            "Ollama not found. Please install from: https://ollama.ai"
          )
        );
        console.log(chalk.gray("\nInstallation:"));
        console.log(
          chalk.white("  macOS/Linux: curl https://ollama.ai/install.sh | sh")
        );
        console.log(
          chalk.white("  Windows: Download from https://ollama.ai/download")
        );
        return;
      }

      // Pull embedding model
      console.log(chalk.cyan("\nPulling nomic-embed-text model..."));
      console.log(chalk.gray("(This may take a few minutes on first run)\n"));

      const pullProcess = exec("ollama pull nomic-embed-text");
      pullProcess.stdout?.pipe(process.stdout);
      pullProcess.stderr?.pipe(process.stderr);

      await new Promise((resolve, reject) => {
        pullProcess.on("close", (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`ollama pull exited with code ${code}`));
        });
      });

      console.log(chalk.green("\n✓ Model downloaded successfully"));

      // Test embedding
      console.log(chalk.cyan("\nTesting embeddings..."));
      await execAsync('ollama run nomic-embed-text "test embedding"');

      console.log(chalk.green("✓ Embeddings working!"));

      // Show configuration
      console.log(chalk.bold("\n📝 Configuration:"));
      console.log(chalk.white("  Add to .env or export:"));
      console.log(chalk.cyan("  export TRACEFORGE_EMBEDDING_PROVIDER=ollama"));
      console.log(
        chalk.cyan("  export TRACEFORGE_EMBEDDING_MODEL=nomic-embed-text")
      );

      console.log(
        chalk.bold(
          "\n✨ Setup complete! Semantic assertions will now use local embeddings."
        )
      );
    } catch (error: any) {
      console.error(chalk.red("\n✗ Setup failed:"), error.message);
      process.exit(1);
    }
  });

embeddingsCommand
  .command("test")
  .description("Test embedding configuration")
  .option("--text <text>", "Text to embed", "Hello, world!")
  .action(async (options) => {
    try {
      const { getDefaultEmbeddingService } = await import("@traceforge/shared");

      console.log(
        chalk.cyan(`\nGenerating embedding for: "${options.text}"\n`)
      );

      const service = getDefaultEmbeddingService();
      const startTime = Date.now();
      const embedding = await service.embed(options.text);
      const duration = Date.now() - startTime;

      console.log(chalk.green("✓ Success!"));
      console.log(chalk.gray(`  Provider: ${service.getProvider()}`));
      console.log(chalk.gray(`  Dimension: ${embedding.length}`));
      console.log(chalk.gray(`  Duration: ${duration}ms`));
      console.log(
        chalk.gray(
          `  First 5 values: [${embedding
            .slice(0, 5)
            .map((v) => v.toFixed(4))
            .join(", ")}...]`
        )
      );
    } catch (error: any) {
      console.error(chalk.red("\n✗ Test failed:"), error.message);

      if (error.message.includes("OPENAI_API_KEY")) {
        console.log(
          chalk.yellow("\n💡 Tip: Use local embeddings with Ollama:")
        );
        console.log(chalk.white("  traceforge embeddings setup-ollama"));
      } else if (error.message.includes("Cannot connect to Ollama")) {
        console.log(chalk.yellow("\n💡 Tip: Start Ollama service:"));
        console.log(chalk.white("  ollama serve"));
      }

      process.exit(1);
    }
  });

embeddingsCommand
  .command("compare")
  .description("Compare two texts for semantic similarity")
  .requiredOption("--text1 <text>", "First text")
  .requiredOption("--text2 <text>", "Second text")
  .action(async (options) => {
    try {
      const { getDefaultEmbeddingService, cosineSimilarity } = await import(
        "@traceforge/shared"
      );

      console.log(chalk.cyan("\nComparing texts...\n"));
      console.log(chalk.gray(`Text 1: "${options.text1}"`));
      console.log(chalk.gray(`Text 2: "${options.text2}"\n`));

      const service = getDefaultEmbeddingService();

      const [embedding1, embedding2] = await Promise.all([
        service.embed(options.text1),
        service.embed(options.text2),
      ]);

      const similarity = cosineSimilarity(embedding1, embedding2);

      console.log(chalk.green("✓ Comparison complete!"));
      console.log(chalk.gray(`  Provider: ${service.getProvider()}`));
      console.log(
        chalk.bold(`  Similarity: ${(similarity * 100).toFixed(2)}%`)
      );

      if (similarity >= 0.9) {
        console.log(chalk.green("  → Very similar (≥90%)"));
      } else if (similarity >= 0.7) {
        console.log(chalk.yellow("  → Somewhat similar (70-90%)"));
      } else {
        console.log(chalk.red("  → Not similar (<70%)"));
      }
    } catch (error: any) {
      console.error(chalk.red("\n✗ Comparison failed:"), error.message);
      process.exit(1);
    }
  });

embeddingsCommand
  .command("info")
  .description("Show current embedding configuration")
  .action(async () => {
    try {
      const { loadEmbeddingConfig } = await import("@traceforge/shared");

      const config = loadEmbeddingConfig();

      console.log(chalk.bold("\n📊 Embedding Configuration\n"));
      console.log(chalk.gray("Provider:"), chalk.white(config.provider));
      console.log(
        chalk.gray("Model:"),
        chalk.white(config.model || "(default)")
      );

      if (config.provider === "ollama") {
        console.log(
          chalk.gray("Base URL:"),
          chalk.white(config.baseUrl || "http://localhost:11434")
        );
      }

      console.log(
        chalk.gray("Cache Enabled:"),
        chalk.white(config.cacheEnabled ? "Yes" : "No")
      );

      if (config.cacheEnabled) {
        console.log(
          chalk.gray("Cache Path:"),
          chalk.white(config.cachePath || ".ai-tests/embeddings-cache")
        );
      }

      console.log("");
    } catch (error: any) {
      console.error(
        chalk.red("\n✗ Failed to load configuration:"),
        error.message
      );
      process.exit(1);
    }
  });
