import math
import sys
import time

import moderngl
import pygame

WIDTH = 1600
HEIGHT = 900
FPS = 60


def load_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main():
    pygame.init()
    pygame.display.gl_set_attribute(pygame.GL_CONTEXT_MAJOR_VERSION, 3)
    pygame.display.gl_set_attribute(pygame.GL_CONTEXT_MINOR_VERSION, 3)
    pygame.display.gl_set_attribute(
        pygame.GL_CONTEXT_PROFILE_MASK, pygame.GL_CONTEXT_PROFILE_CORE
    )

    pygame.display.set_mode((WIDTH, HEIGHT), pygame.OPENGL | pygame.DOUBLEBUF)
    pygame.display.set_caption("Nekorin Core Visual — GPU Prototype")

    ctx = moderngl.create_context()
    ctx.disable(moderngl.DEPTH_TEST)

    program = ctx.program(
        vertex_shader=load_text("shaders/core.vert"),
        fragment_shader=load_text("shaders/core.frag"),
    )

    vao = ctx.vertex_array(program, [])

    start = time.perf_counter()
    clock = pygame.time.Clock()
    running = True
    pulse_kick = 0.0

    while running:
        dt = clock.tick(FPS) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_m:
                    pulse_kick = 1.0

        pulse_kick = max(0.0, pulse_kick - dt * 1.8)

        t = time.perf_counter() - start
        program["u_time"].value = t
        program["u_resolution"].value = (float(WIDTH), float(HEIGHT))
        program["u_pulse"].value = pulse_kick

        ctx.clear(0.002, 0.005, 0.012, 1.0)
        vao.render(mode=moderngl.TRIANGLES, vertices=3)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
