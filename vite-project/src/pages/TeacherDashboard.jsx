import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  HStack,
  Icon,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
} from '@chakra-ui/react'
import { AddIcon, EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TeacherDashboard() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const toast = useToast()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  useEffect(() => {
    if (!user) return;
    fetchTests()
  }, [user])

  const fetchTests = async () => {
    try {
      setLoading(true)
      console.log('Fetching tests for user:', user.id)
      
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Log the fetched tests
      console.log('Fetched tests:', data)
      
      // Validate test data
      const validTests = data?.filter(test => test && test.id) || []
      if (validTests.length !== data?.length) {
        console.warn('Some tests have missing IDs:', data)
      }

      setTests(validTests)
    } catch (error) {
      console.error('Error fetching tests:', error)
      toast({
        title: 'Error fetching tests',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setTests([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (testId) => {
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId)
      if (error) throw error
      setTests(tests.filter((test) => test.id !== testId))
      toast({
        title: 'Test deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error deleting test:', error)
      toast({
        title: 'Error deleting test',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleEditTest = (test) => {
    if (!test || !test.id) {
      console.error('Invalid test data:', test)
      toast({
        title: 'Error',
        description: 'Invalid test data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    console.log('Editing test:', test)
  }

  return (
    <Container maxW="container.xl" py={{ base: '8', md: '12' }}>
      <Stack spacing={{ base: '8', md: '12' }}>
        <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align="center">
          <Stack>
            <Heading size="lg">My Tests</Heading>
            <Text color={useColorModeValue('gray.600', 'gray.300')}>
              Create and manage your MCQ tests
            </Text>
          </Stack>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4} w={{ base: 'full', md: 'auto' }}>
            <Button
              as={RouterLink}
              to="/teacher/generate-quiz"
              leftIcon={<Icon as={() => '🤖'} />}
              colorScheme="purple"
              w={{ base: 'full', md: 'auto' }}
            >
              Generate with AI
            </Button>
            <Button
              as={RouterLink}
              to="/teacher/create-test"
              leftIcon={<AddIcon />}
              colorScheme="blue"
              w={{ base: 'full', md: 'auto' }}
            >
              Create New Test
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Stack spacing={4} align="center">
            <Spinner size="xl" />
            <Text>Loading tests...</Text>
          </Stack>
        ) : tests.length === 0 ? (
          <Box
            p={8}
            bg={bgColor}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="lg"
            textAlign="center"
          >
            <Text mb={4}>You haven't created any tests yet.</Text>
            <Button
              as={RouterLink}
              to="/teacher/create-test"
              leftIcon={<AddIcon />}
              colorScheme="blue"
            >
              Create Your First Test
            </Button>
          </Box>
        ) : (
          <Grid
            templateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            }}
            gap={6}
          >
            {tests.map((test) => (
              <Box
                key={test.id}
                p={6}
                bg={bgColor}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="lg"
              >
                <VStack align="stretch" spacing={4}>
                  <Stack direction="row" justify="space-between" align="center">
                    <Heading size="md">{test.title}</Heading>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        aria-label="Options"
                        icon={<ViewIcon />}
                        variant="ghost"
                      />
                      <MenuList>
                        <MenuItem
                          as={RouterLink}
                          to={`/test/${test.id}`}
                          icon={<ViewIcon />}
                        >
                          View Test
                        </MenuItem>
                        <MenuItem
                          as={RouterLink}
                          to={`/teacher/edit-test/${test.id}`}
                          icon={<EditIcon />}
                          onClick={() => handleEditTest(test)}
                        >
                          Edit Test
                        </MenuItem>
                        <MenuItem
                          as={RouterLink}
                          to={`/teacher/test-analytics/${test.id}`}
                          icon={<ViewIcon />}
                        >
                          View Analytics
                        </MenuItem>
                        <MenuItem
                          icon={<DeleteIcon />}
                          color="red.500"
                          onClick={() => handleDeleteTest(test.id)}
                        >
                          Delete Test
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Stack>
                  <Text color={useColorModeValue('gray.600', 'gray.300')}>
                    {test.description || 'No description'}
                  </Text>
                  <Stack direction="row" spacing={2} align="center">
                    <Badge colorScheme={test.is_published ? 'green' : 'yellow'}>
                      {test.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      {test.duration} minutes
                    </Text>
                  </Stack>
                </VStack>
              </Box>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  )
} 