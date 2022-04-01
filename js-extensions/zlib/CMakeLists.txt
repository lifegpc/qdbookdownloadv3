cmake_minimum_required(VERSION 3.1)

project(zlib-wasm)

find_package(ZLIB REQUIRED)

option(WEB_ONLY "Build only for web" ON)

include(GNUInstallDirs)

add_link_options("SHELL:-s WASM=1")
add_link_options("SHELL:-s EXPORTED_RUNTIME_METHODS='[\"cwrap\"]'")
add_link_options("SHELL:--post-js \"${CMAKE_CURRENT_SOURCE_DIR}/post.js\"")
add_link_options("SHELL:-s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\"]'")
if (WEB_ONLY)
    add_link_options("SHELL:--post-js \"${CMAKE_CURRENT_SOURCE_DIR}/post2.js\"")
    add_link_options("SHELL:--pre-js \"${CMAKE_CURRENT_SOURCE_DIR}/pre.js\"")
    add_link_options("SHELL:-s ENVIRONMENT=web")
endif()

add_executable(_zlib zlib_wasm.c)
target_link_libraries(_zlib ZLIB::ZLIB)
install(TARGETS _zlib)
install(FILES ${CMAKE_BINARY_DIR}/_zlib.wasm DESTINATION ${CMAKE_INSTALL_BINDIR})
