# Figuras del trabajo

| Fichero | Figura | Cómo se obtiene |
|---|---|---|
| `figura2_saga_outbox.mmd` | Fuente de la figura 2 (integración del marco con una saga orquestada y el patrón Transactional Outbox), en Mermaid | Se edita a mano |
| `mermaid.config.json` | Configuración de Mermaid para la figura 2 (tema, tipografía y tamaños) | — |
| `figura2_saga_outbox.png` | Figura 2 renderizada | Con mermaid-cli y la configuración anterior, por ejemplo `npx -p @mermaid-js/mermaid-cli mmdc -i figura2_saga_outbox.mmd -c mermaid.config.json -o figura2_saga_outbox.png` |
| `figura3_informe_e2e.png` | Figura 3: informe de las pruebas de extremo a extremo (resumen de la ejecución y escenario 6a) | Captura de `../prototipo/informes/e2e.html` tras `npm run e2e` |

Las figuras 1 (arquitectura de referencia) y las del artículo del anexo A están dibujadas en el propio documento.
