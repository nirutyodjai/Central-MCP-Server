import java.nio.file.*;
import org.json.JSONObject;

public class ReadConfig {
    public static void main(String[] args) throws Exception {
        String content = new String(Files.readAllBytes(Paths.get("C:/central-mcp-config.json")));
        JSONObject config = new JSONObject(content);
        String mcpUrl = config.getString("centralMcpServerUrl");
        System.out.println(mcpUrl);
    }
}
