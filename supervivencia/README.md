# Último Fuego — supervivencia 3D para PC

Juego original de supervivencia en primera persona (recolección, fabricación, construcción y combate), hecho con Three.js y sin dependencias ni compilación. Se juega en el navegador con teclado y ratón.

## Jugar

Usa módulos JS, así que necesita un servidor estático. Desde la raíz del repositorio:

```bash
npx http-server .
```

y abre `http://localhost:8080/supervivencia/`. En GitHub Pages queda en `/Proyects/supervivencia/`.

## Qué incluye

- Isla generada por procedimiento con playas, bosques y montañas.
- Recursos: árboles, rocas, arbustos y vetas de hierro (reaparecen con el tiempo).
- Vida, energía, hambre y sed; ciclo de día y noche.
- Fabricación: herramientas de piedra y hierro, lanza, espada, antorcha, vendas, armaduras, cocina y fundición.
- Construcción en rejilla: cimientos, paredes, puertas, techos, hoguera, cama, banco de trabajo, horno y faro. Las paredes detienen a los enemigos.
- Criaturas: ciervos, chacales y espectros nocturnos.
- Niveles de experiencia, objetivos guiados y final (encender el faro).
- Guardado automático en el navegador.

## Controles

| Tecla | Acción |
| --- | --- |
| WASD / ratón | Moverse / mirar |
| Shift / Espacio | Correr / saltar |
| Clic | Golpear, recolectar o colocar pieza |
| 1-6 | Manos, hacha, pico, arma, antorcha, construir |
| TAB | Fabricación e inventario |
| E / F / V | Beber o dormir / comer / venda |
| Rueda o R / X | Cambiar pieza / demoler |
| Esc | Pausa |

## Archivos

- `index.html` — interfaz
- `style.css` — estilos
- `game.js` — todo el juego
