cmake_minimum_required(VERSION 3.1)

project(zlib-wasm)

option(ENABLE_DYNMAIC_LINK "Enable dunmaic link" OFF)

find_package(ZLIB REQUIRED)

option(WEB_ONLY "Build only for web" ON)
option(ALLOW_MEMORY_GROWTH "Allow memory growth" ON)
set(TOTAL_STACK "512KB" CACHE STRING "The total stack size.")
set(INITIAL_MEMORY "1MB" CACHE STRING "Initial memory size")
option(MEMORY_GROWTH_LINEAR_STEP "Memory growth step" OFF)

include(GNUInstallDirs)

add_link_options("SHELL:-s WASM=1")
add_link_options("SHELL:-s EXPORTED_RUNTIME_METHODS='[\"cwrap\"]'")
add_link_options("SHELL:--post-js \"${CMAKE_CURRENT_SOURCE_DIR}/post.js\"")
if (NOT ENABLE_DYNMAIC_LINK)
    add_link_options("SHELL:-s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\", \"_uncompress2\", \"_deflateEnd\"]'")
endif()
add_link_options("SHELL:-s TOTAL_STACK=${TOTAL_STACK}")
add_link_options("SHELL:-s TOTAL_MEMORY=${INITIAL_MEMORY}")
if (ALLOW_MEMORY_GROWTH)
    add_link_options("SHELL:-s ALLOW_MEMORY_GROWTH=1")
endif()
if (ENABLE_DYNMAIC_LINK)
    add_link_options("SHELL:-s MAIN_MODULE=2")
    add_compile_options(-fPIC)
endif()
if (MEMORY_GROWTH_LINEAR_STEP)
    add_link_options("SHELL:-s MEMORY_GROWTH_LINEAR_STEP=${MEMORY_GROWTH_LINEAR_STEP}")
endif()
if (WEB_ONLY)
    add_link_options("SHELL:--post-js \"${CMAKE_CURRENT_SOURCE_DIR}/post2.js\"")
    add_link_options("SHELL:--pre-js \"${CMAKE_CURRENT_SOURCE_DIR}/pre.js\"")
    add_link_options("SHELL:-s ENVIRONMENT=web")
endif()

add_executable(_zlib zlib_wasm.c)
target_link_libraries(_zlib ZLIB::ZLIB)
install(TARGETS _zlib)
install(FILES ${CMAKE_BINARY_DIR}/_zlib.wasm DESTINATION ${CMAKE_INSTALL_BINDIR})
