<?php
$config = json_decode(file_get_contents('C:/central-mcp-config.json'), true);
echo $config['centralMcpServerUrl'];
