import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { HamburgerIcon, MoonIcon, SunIcon } from '@chakra-ui/icons'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { colorMode, toggleColorMode } = useColorMode()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getDashboardLink = () => {
    if (!user) return '/login'
    return user.user_metadata.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
  }

  return (
    <Box
      bg={useColorModeValue('white', 'gray.800')}
      color={useColorModeValue('gray.600', 'white')}
      borderBottom={1}
      borderStyle="solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      px={4}
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <IconButton
            size="md"
            icon={isOpen ? <HamburgerIcon /> : <HamburgerIcon />}
            aria-label="Open Menu"
            display={{ md: 'none' }}
            onClick={isOpen ? onClose : onOpen}
          />
          <HStack spacing={8} alignItems="center">
            <RouterLink to="/">
              <Box fontWeight="bold" fontSize="xl">
                QuizSupa
              </Box>
            </RouterLink>
            <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
              <RouterLink to="/">Home</RouterLink>
              {user && (
                <>
                  <RouterLink to={getDashboardLink()}>Dashboard</RouterLink>
                  {user.user_metadata.role === 'teacher' && (
                    <RouterLink to="/teacher/create-test">Create Test</RouterLink>
                  )}
                </>
              )}
            </HStack>
          </HStack>
          <Flex alignItems="center">
            <Stack direction="row" spacing={4}>
              <IconButton
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                aria-label="Toggle color mode"
              />
              {user ? (
                <Menu>
                  <MenuButton
                    as={Button}
                    rounded="full"
                    variant="link"
                    cursor="pointer"
                  >
                    {user.email}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <>
                  <Button
                    as={RouterLink}
                    to="/login"
                    fontSize="sm"
                    fontWeight={400}
                    variant="link"
                  >
                    Sign In
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/register"
                    display={{ base: 'none', md: 'inline-flex' }}
                    fontSize="sm"
                    fontWeight={600}
                    color="white"
                    bg="blue.400"
                    _hover={{
                      bg: 'blue.300',
                    }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </Stack>
          </Flex>
        </Flex>
      </Container>

      <Box
        pb={4}
        display={{ md: 'none' }}
        bg={useColorModeValue('white', 'gray.800')}
        borderBottom={1}
        borderStyle="solid"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <Stack as="nav" spacing={4}>
          <RouterLink to="/">Home</RouterLink>
          {user && (
            <>
              <RouterLink to={getDashboardLink()}>Dashboard</RouterLink>
              {user.user_metadata.role === 'teacher' && (
                <RouterLink to="/teacher/create-test">Create Test</RouterLink>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
} 